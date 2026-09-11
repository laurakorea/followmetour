-- 팔로우미투어 초기 스키마.
-- 이관이 아니라 신규 설계 — 워드프레스 커스텀 포스트 타입(투어/일정/예약/파트너예약/
-- 후기/수입관리/티켓관리)을 정규화한 결과. 대응 관계는 각 테이블 주석 참고.
-- 확정된 스코프(CLAUDE.md)를 그대로 반영: 고객 계정 없음, 예약·파트너예약 통합,
-- 가이드는 profiles(role='guide')로 정규화, 후기는 최소확인 후 모더레이션.

create extension if not exists "pgcrypto";

-- ── enums ────────────────────────────────────────────────────────────────

create type staff_role as enum ('admin', 'guide');

create type reservation_channel as enum ('partner_agency', 'staff_entry');

create type reservation_status as enum (
  'pending',
  'confirmed',
  'completed',
  'cancelled_unpaid',      -- 미입금취소
  'cancelled_by_customer', -- 고객요청취소
  'cancelled_refunded'     -- 환불취소
);

create type settlement_status as enum ('unsettled', 'settled');

create type review_status as enum ('pending', 'approved', 'rejected');

create type ledger_category as enum ('tour_fee', 'ticket_fee', 'misc_income', 'misc_expense');

create type ticket_direction as enum ('expense', 'income');

create type ticket_channel as enum ('lacaixa', 'company', 'cyber', 'domestic', 'other');

-- ── staff (admin·가이드) ─────────────────────────────────────────────────
-- 고객 계정은 없음 — 이 테이블은 스태프 전용. auth.users를 1:1로 확장한다.

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role staff_role not null,
  name text not null,
  phone text,
  created_at timestamptz not null default now()
);

comment on table profiles is '스태프(관리자·가이드) 전용. 고객은 이 테이블에 존재하지 않는다.';

-- 대행사(파트너)는 로그인이 필요 없는 조회용 참조 테이블 — 예약의 채널 정보로만 쓰인다.
create table partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

-- ── 투어 상품 ────────────────────────────────────────────────────────────

create table tours (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text,
  region text,
  is_customer_visible boolean not null default true, -- 09-11 결정: 비공개 투어는 삭제 대신 이 플래그로만 숨김
  my_real_trip_url text,
  legacy_wp_slug text, -- 구 사이트 sitemap URL과의 301 매핑용, 이관 완료 후 제거 가능
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── 일정 (회차) ──────────────────────────────────────────────────────────
-- 워드프레스의 "일정" CPT(투어×날짜 슬롯, 정원·가이드 배정)에 대응.
-- 가이드 배정은 09-11 결정에 따라 자유 텍스트가 아니라 profiles로 정규화.

create table schedules (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours (id) on delete restrict,
  date date not null,
  start_time time,
  capacity int not null default 0,
  is_available boolean not null default true,
  guide_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index schedules_tour_date_idx on schedules (tour_id, date);
create index schedules_guide_idx on schedules (guide_id);

-- ── 예약 (자사예약 + 파트너예약 통합) ────────────────────────────────────
-- 09-11 결정: 두 테이블을 하나로 합친다. channel로 구분.
-- 고객 자체 회원가입·자사 홈페이지 예약은 없음 — 이 테이블은 스태프가 대행사/
-- 야간투어 이벤트 참가자를 수기로 입력하는 운영 데이터다. 기존 워드프레스의
-- 고객 PII 67,080건은 이관하지 않고 파기 — 이 테이블은 신규 운영 데이터만 담는다.

create table reservations (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references schedules (id) on delete restrict,
  channel reservation_channel not null,
  partner_id uuid references partners (id), -- channel = 'partner_agency'일 때만 값 존재
  status reservation_status not null default 'confirmed',
  settlement_status settlement_status not null default 'unsettled',
  contact_name text,
  contact_email text,
  contact_phone text,
  headcount_adult int not null default 0,
  headcount_child int not null default 0,
  deposit_amount numeric(12, 2) not null default 0,
  onsite_extra_amount numeric(12, 2) not null default 0,
  note text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index reservations_schedule_idx on reservations (schedule_id);
create index reservations_partner_idx on reservations (partner_id);

-- ── 후기 ─────────────────────────────────────────────────────────────────
-- 09-11 결정: 완전 오픈폼이 아니라 투어명+투어일 최소확인 후 작성,
-- 모더레이션 큐를 거쳐 승인된 것만 고객 화면에 노출.

create table reviews (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references tours (id) on delete restrict,
  tour_date date not null,
  author_name text not null,
  content text not null,
  rating smallint check (rating between 1 and 5),
  status review_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index reviews_status_idx on reviews (status);

-- ── 정산 (수입관리) ──────────────────────────────────────────────────────
-- 회차(schedule)에 매출·입장권원가·기타수지를 합산해 결산하던 워드프레스
-- "수입관리" 화면에 대응. 결산액은 이 테이블에서 SUM으로 계산 — 별도 저장 안 함.

create table ledger_entries (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid references schedules (id) on delete cascade,
  category ledger_category not null,
  amount numeric(12, 2) not null,
  note text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index ledger_entries_schedule_idx on ledger_entries (schedule_id);

-- ── 티켓관리 ─────────────────────────────────────────────────────────────
-- 장소(성당·공원 등)별 입장권 매입원가·판매수익 대조.

create table venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table ticket_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references venues (id) on delete restrict,
  schedule_id uuid references schedules (id) on delete set null,
  direction ticket_direction not null,
  channel ticket_channel,
  amount numeric(12, 2) not null,
  entry_date date not null,
  note text,
  created_at timestamptz not null default now()
);

create index ticket_ledger_entries_venue_date_idx on ticket_ledger_entries (venue_id, entry_date);

-- ── row level security ───────────────────────────────────────────────────
-- 스태프 판별 헬퍼. 세분화된 역할별 권한(가이드는 본인 일정만 등)은 아직
-- 구현하지 않음 — 골격 단계라 "스태프 전체 접근 vs 공개 접근"만 나눈다.
-- TODO: 가이드 화면 붙일 때 guide_id = auth.uid() 로 스코프 좁히는 정책 추가.

create function is_staff()
returns boolean
language sql
security definer
stable
as $$
  select exists (select 1 from profiles where id = auth.uid());
$$;

alter table profiles enable row level security;
alter table partners enable row level security;
alter table tours enable row level security;
alter table schedules enable row level security;
alter table reservations enable row level security;
alter table reviews enable row level security;
alter table ledger_entries enable row level security;
alter table venues enable row level security;
alter table ticket_ledger_entries enable row level security;

-- 자기 자신 조회는 항상 허용(로그인 직후 role 확인용), 그 외 스태프 목록
-- 조회(예: 관리자가 가이드 배정 드롭다운을 채울 때)는 스태프 전체에 허용.
create policy "self can read own profile" on profiles for select using (id = auth.uid());
create policy "staff can read all profiles" on profiles for select using (is_staff());
create policy "staff full access" on partners for all using (is_staff()) with check (is_staff());

create policy "public reads visible tours" on tours for select using (is_customer_visible or is_staff());
create policy "staff manages tours" on tours for insert with check (is_staff());
create policy "staff updates tours" on tours for update using (is_staff());
create policy "staff deletes tours" on tours for delete using (is_staff());

create policy "staff full access" on schedules for all using (is_staff()) with check (is_staff());
create policy "staff full access" on reservations for all using (is_staff()) with check (is_staff());

create policy "public reads approved reviews" on reviews for select using (status = 'approved' or is_staff());
create policy "anyone can submit a review" on reviews for insert with check (status = 'pending');
create policy "staff moderates reviews" on reviews for update using (is_staff());
create policy "staff deletes reviews" on reviews for delete using (is_staff());

create policy "staff full access" on ledger_entries for all using (is_staff()) with check (is_staff());
create policy "staff full access" on venues for all using (is_staff()) with check (is_staff());
create policy "staff full access" on ticket_ledger_entries for all using (is_staff()) with check (is_staff());
