-- 2026-09-13: 화면 리뷰 완료 후 스키마 확정 1차 보정.
-- src/lib/sample-data.ts에 이미 반영되어 있던 09-11~09-13 결정 사항 중
-- 초안(20260911024723_init_schema.sql)에 빠져 있던 부분을 맞춘다. 아직
-- 실사용 데이터가 없는 빈 테이블들이라 컬럼 rename/재정의를 자유롭게 한다.

-- ── 직원 재직 상태 ───────────────────────────────────────────────────────
-- 그만둔 직원도 지우지 않고 "이전 직원"으로만 옮겨둔다(2026-09-13 확인).

alter table profiles
  add column status text not null default 'active'
    check (status in ('active', 'former'));

-- ── 스케줄 ↔ 가이드: 단일 FK가 아니라 다대다 ────────────────────────────
-- 캘린더에서 스케줄 하나에 가이드를 복수 배정할 수 있어야 한다(공동 진행·
-- 백업 등, sample-data.ts의 Schedule.guideNames 참고). 미배정 상태는 단순히
-- 이 테이블에 행이 없는 것으로 표현한다("관리자" 자리표시자는 화면 로직으로만
-- 처리).

alter table schedules drop column guide_id;

create table schedule_guides (
  schedule_id uuid not null references schedules (id) on delete cascade,
  guide_id uuid not null references profiles (id) on delete cascade,
  primary key (schedule_id, guide_id)
);

create index schedule_guides_guide_idx on schedule_guides (guide_id);

-- ── 예약 상태: 취소 사유 3분화 폐기 ──────────────────────────────────────
-- 2026-09-12 확인: 미입금취소/고객요청취소/환불취소를 나누지 않고 "예약취소"
-- 하나로 합친다.

alter table reservations alter column status type text;
drop type reservation_status;
create type reservation_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
alter table reservations
  alter column status type reservation_status using status::reservation_status,
  alter column status set default 'confirmed';

-- ── 예약 인원·옵션: 고정 컬럼 대신 자유 항목 배열 ───────────────────────
-- 성인/아동 등 "상세 인원" 구분과 "옵션 항목"(투어 옵션별 결제 금액)은 항목명이
-- 투어마다 달라서 고정 컬럼(headcount_adult/headcount_child)이 아니라 자유
-- 라벨+금액 배열로 저장한다(sample-data.ts LabeledEntry 참고). 총 인원은
-- headcount로 별도 보관.

alter table reservations drop column headcount_adult;
alter table reservations drop column headcount_child;
alter table reservations add column headcount int not null default 0;
alter table reservations add column detail_breakdown jsonb; -- LabeledEntry[] | null
alter table reservations add column option_items jsonb; -- LabeledEntry[] | null

-- 통화가 섞여 있음을 컬럼명에 분명히 한다 — 예약금은 원화, 현장지불금은 유로.
alter table reservations rename column deposit_amount to advance_deposit_krw;
alter table reservations rename column onsite_extra_amount to onsite_payment_eur;

alter table reservations add column early_bird_discount boolean not null default false;
-- 출석 확인: 예/아니오/미확인(null) 세 상태.
alter table reservations add column attended boolean;

-- ── 가이드 영수증 ────────────────────────────────────────────────────────
-- 정산 > 영수증 관리. 가이드가 사진+금액을 올리면 관리자가 확인 체크한다.
-- 사진은 Supabase Storage의 receipts 버킷에 guide_id 폴더로 저장한다.

create table receipts (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references profiles (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  payout_date date,
  used_date date,
  reason text,
  amount_krw numeric(12, 2) not null default 0,
  photo_path text, -- storage.objects의 receipts 버킷 경로 (예: "<guide_id>/<uuid>.jpg")
  checked boolean not null default false -- 관리자 확인 여부
);

create index receipts_guide_idx on receipts (guide_id);

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- ── 가이드 정산서 ────────────────────────────────────────────────────────
-- 가이드가 그 주에 갖고 있던 현금(정산금 항목)과 가이드에게 돌려줄 지급
-- 항목을 나눠 적고, "정산금 합계 - 지급 합계"로 최종 정산액을 계산한다.
-- 항목명이 매번 달라서(예: "7일 티켓비") 고정 컬럼이 아니라 하위 테이블로
-- label+amount를 줄 단위로 저장한다.

create table guide_settlements (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references profiles (id) on delete cascade,
  region text,
  period_start date not null,
  period_end date not null,
  completed boolean not null default false, -- 관리자 처리완료 체크
  created_at timestamptz not null default now()
);

create index guide_settlements_guide_idx on guide_settlements (guide_id);

create table guide_settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references guide_settlements (id) on delete cascade,
  kind text not null check (kind in ('collected', 'payout')), -- 정산금 | 지급항목
  label text not null,
  amount numeric(12, 2) not null default 0,
  position int not null default 0 -- 화면 표시 순서
);

create index guide_settlement_items_settlement_idx on guide_settlement_items (settlement_id);

-- ── 가이드 급여명세서 ────────────────────────────────────────────────────
-- 정산서와 반대 방향 — 사무실이 가이드에게 주는 급여. 지급항목/공제항목
-- 좌우 2단, "급여계 - 공제합계 = 차감 수령액".

create table guide_payslips (
  id uuid primary key default gen_random_uuid(),
  guide_id uuid not null references profiles (id) on delete cascade,
  region text,
  pay_month date not null, -- 대상 월의 1일로 저장 (예: 2026-08-01)
  pay_date date,
  completed boolean not null default false, -- 관리자 처리완료(지급완료) 체크
  created_at timestamptz not null default now()
);

create index guide_payslips_guide_idx on guide_payslips (guide_id);

create table guide_payslip_items (
  id uuid primary key default gen_random_uuid(),
  payslip_id uuid not null references guide_payslips (id) on delete cascade,
  kind text not null check (kind in ('payment', 'deduction')),
  label text not null,
  amount numeric(12, 2) not null default 0,
  position int not null default 0
);

create index guide_payslip_items_payslip_idx on guide_payslip_items (payslip_id);

-- ── row level security ───────────────────────────────────────────────────

alter table schedule_guides enable row level security;
alter table receipts enable row level security;
alter table guide_settlements enable row level security;
alter table guide_settlement_items enable row level security;
alter table guide_payslips enable row level security;
alter table guide_payslip_items enable row level security;

create policy "staff full access" on schedule_guides for all using (is_staff()) with check (is_staff());

-- 영수증: 스태프 전체 접근 + 가이드 본인 것만 조회/등록.
create policy "staff full access" on receipts for all using (is_staff()) with check (is_staff());
create policy "guide reads own receipts" on receipts for select using (guide_id = auth.uid());
create policy "guide submits own receipts" on receipts for insert with check (guide_id = auth.uid());

-- 정산서: 스태프 전체 접근 + 가이드 본인 것만 조회.
create policy "staff full access" on guide_settlements for all using (is_staff()) with check (is_staff());
create policy "guide reads own settlements" on guide_settlements for select using (guide_id = auth.uid());

create policy "staff full access" on guide_settlement_items for all using (is_staff()) with check (is_staff());
create policy "guide reads own settlement items" on guide_settlement_items for select using (
  exists (
    select 1 from guide_settlements gs
    where gs.id = settlement_id and gs.guide_id = auth.uid()
  )
);

-- 급여명세서: 스태프 전체 접근 + 가이드 본인 것만 조회.
create policy "staff full access" on guide_payslips for all using (is_staff()) with check (is_staff());
create policy "guide reads own payslips" on guide_payslips for select using (guide_id = auth.uid());

create policy "staff full access" on guide_payslip_items for all using (is_staff()) with check (is_staff());
create policy "guide reads own payslip items" on guide_payslip_items for select using (
  exists (
    select 1 from guide_payslips gp
    where gp.id = payslip_id and gp.guide_id = auth.uid()
  )
);

-- receipts 버킷: 스태프는 전체, 가이드는 자기 폴더(<guide_id>/...)만.
create policy "staff full access to receipt photos" on storage.objects for all using (
  bucket_id = 'receipts' and is_staff()
) with check (bucket_id = 'receipts' and is_staff());

create policy "guide manages own receipt photos" on storage.objects for all using (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
) with check (
  bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text
);
