import PerformanceChart from "./PerformanceChart";

export default function TradingSection() {
  return (
    <div className="min-h-screen w-full bg-[#05070d] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12">
        <PerformanceChart />
      </div>
    </div>
  );
}
