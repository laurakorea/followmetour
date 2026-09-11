import { SAMPLE_TOURS } from "@/lib/sample-data";

// Skeleton — real listing will read `tours` where is_customer_visible = true.
const VISIBLE_TOURS = SAMPLE_TOURS.filter((t) => t.isCustomerVisible);

export default function CustomerHomePage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <h1 className="font-display text-2xl text-ink-900 text-balance">
        스페인 전문 여행사, 팔로우미투어
      </h1>
      <div className="grid gap-4">
        {VISIBLE_TOURS.map((tour) => (
          <a
            key={tour.id}
            href={tour.myRealTripUrl ?? "#"}
            className="rounded-md border border-line bg-surface p-4 transition-colors hover:border-rose-600"
          >
            <p className="text-xs text-ink-500">{tour.region}</p>
            <p className="font-display text-lg text-ink-900">{tour.name}</p>
            {!tour.myRealTripUrl && (
              <span className="mt-2 inline-block rounded-full bg-warn-wash px-2 py-0.5 text-xs text-warn">
                마이리얼트립 연결 준비중 (예시 데이터)
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
