import {
  useGetCaptainEarnings,
  useGetCaptainTransactions,
} from "@workspace/api-client-react";
import type { Transaction } from "@workspace/api-client-react";

function formatDate(str: string) {
  return new Date(str).toLocaleDateString("en-JO", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function txColor(type: Transaction["type"]) {
  if (type === "trip_earning") return "text-[#22C55E]";
  if (type === "trip_commission") return "text-red-400";
  if (type === "admin_credit") return "text-blue-400";
  return "text-gray-400";
}

function txLabel(type: Transaction["type"]) {
  if (type === "trip_earning") return "Trip Earning";
  if (type === "trip_commission") return "Commission";
  if (type === "admin_credit") return "Admin Credit";
  return type;
}

function txSign(type: Transaction["type"]) {
  if (type === "trip_commission") return "-";
  return "+";
}

export default function EarningsPage() {
  const { data: earnings, isLoading: earningsLoading } = useGetCaptainEarnings();
  const { data: transactions, isLoading: txLoading } = useGetCaptainTransactions();

  const statCards = [
    { label: "Today", value: earnings?.todayEarnings ?? 0, color: "from-green-600/30 to-green-800/20" },
    { label: "This Week", value: earnings?.weekEarnings ?? 0, color: "from-blue-600/30 to-blue-800/20" },
    { label: "This Month", value: earnings?.monthEarnings ?? 0, color: "from-purple-600/30 to-purple-800/20" },
    { label: "Total", value: earnings?.totalEarnings ?? 0, color: "from-[#22C55E]/30 to-[#16a34a]/20" },
  ];

  return (
    <div className="px-4 py-5 space-y-5">
      <h1 className="text-white font-bold text-xl">Earnings</h1>

      {/* Stat Cards */}
      {earningsLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#1A2D44] rounded-2xl h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`bg-gradient-to-br ${card.color} border border-white/10 rounded-2xl p-4`}
            >
              <p className="text-gray-400 text-xs font-medium mb-1">{card.label}</p>
              <p className="text-white font-bold text-xl">
                {card.value.toFixed(2)}
                <span className="text-xs text-gray-400 font-normal ml-1">JOD</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Balance & Commission Info */}
      {earnings && (
        <div className="bg-[#1A2D44] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Current Balance</p>
            <p className="text-white font-bold text-lg">
              {earnings.balance.toFixed(2)} <span className="text-xs text-gray-400 font-normal">JOD</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-xs mb-0.5">Commission Rate</p>
            <p className="text-[#22C55E] font-bold text-lg">{(earnings.commissionRate * 100).toFixed(0)}%</p>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div>
        <h2 className="text-white font-semibold mb-3">Transaction History</h2>
        {txLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#1A2D44] rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : !transactions?.length ? (
          <div className="text-center py-10 text-gray-500">
            <div className="text-4xl mb-2">💳</div>
            <p>No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-[#1A2D44] border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <p className={`font-semibold text-sm ${txColor(tx.type)}`}>{txLabel(tx.type)}</p>
                  {tx.note && <p className="text-gray-500 text-xs mt-0.5">{tx.note}</p>}
                  <p className="text-gray-600 text-xs mt-0.5">{formatDate(tx.createdAt)}</p>
                </div>
                <p className={`font-bold text-base ${txColor(tx.type)}`}>
                  {txSign(tx.type)}{Math.abs(tx.amount).toFixed(2)} JOD
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
