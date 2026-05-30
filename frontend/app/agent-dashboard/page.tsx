"use client";

import React, {
  useState,
  useEffect,
} from "react";

import {
  ArrowLeft,
  History,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Wallet,
  Copy,
  CheckCircle2,
  Landmark,
} from "lucide-react";

export default function AgentDashboard() {
  const [agentData, setAgentData] =
    useState<any>(null);

  const [commissions, setCommissions] =
    useState<any[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [activeAction, setActiveAction] =
    useState<
      "NONE" |
      "TOPUP" |
      "WITHDRAW" |
      "LIQUIDITY"
    >("NONE");

  // =========================
  // STATES
  // =========================
  const [clientEmail, setClientEmail] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [userPin, setUserPin] =
    useState("");

  const [
    liquidityAmount,
    setLiquidityAmount,
  ] = useState("");

  const [liquidityMethod, setLiquidityMethod] =
    useState<'MONCASH' | 'ZELLE' | 'CASH' | 'BANK'>('MONCASH');

  const [liquidityAccountInfo, setLiquidityAccountInfo] =
    useState('');

  const [liquidityRequests, setLiquidityRequests] =
    useState<any[]>([]);

  const [copied, setCopied] =
    useState(false);

  const backendUrl =
    process.env
      .NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:10000";

  const referralLink =
    typeof window !==
    "undefined"
      ? `${window.location.origin}/register?ref=${agentData?.agentCode || ""}`
      : "";

  // =========================
  // FETCH AGENT DATA
  // =========================
  const fetchAgentSpecs =
    async () => {
      setLoading(true);

      const token =
        localStorage.getItem(
          "token",
        );

      if (!token) {
        window.location.href = "/login";
        return;
      }

      try {
        const agentRes =
          await fetch(
            `${backendUrl}/agents/me`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

        const agentJson =
          await agentRes.json();

        const commRes =
          await fetch(
            `${backendUrl}/agents/commissions`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );

        const commJson =
          await commRes.json();

        const liqRes = await fetch(
          `${backendUrl}/agents/liquidity-requests`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (liqRes.ok) {
          const liqJson = await liqRes.json();
          setLiquidityRequests(Array.isArray(liqJson) ? liqJson : []);
        }

        if (agentRes.ok) {
          if (!agentJson || (!agentJson.agent && !agentJson.agentCode)) {
            window.location.href = "/dashboard";
            return;
          }
          setAgentData(agentJson.agent || agentJson);
        } else {
          window.location.href = "/dashboard";
        }

        if (commRes.ok) {
          setCommissions(
            Array.isArray(
              commJson,
            )
              ? commJson
              : [],
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchAgentSpecs();
  }, []);

  // =========================
  // CASH IN / CASH OUT
  // =========================
  const handleAgentOperation =
    async (
      e: React.FormEvent,
    ) => {
      e.preventDefault();

      if (
        !clientEmail ||
        !amount
      ) {
        alert(
          "Tanpri ranpli tout chan yo",
        );

        return;
      }

      if (
        activeAction ===
          "WITHDRAW" &&
        !userPin
      ) {
        alert(
          "PIN kliyan an obligatwa",
        );

        return;
      }

      setActionLoading(true);

      const token =
        localStorage.getItem(
          "token",
        );

      const endpoint =
        activeAction ===
        "TOPUP"
          ? "/agents/topup"
          : "/agents/withdraw-user";

      const payload: any = {
        email:
          clientEmail
            .trim()
            .toLowerCase(),

        amount:
          parseFloat(amount),
      };

      if (
        activeAction ===
        "WITHDRAW"
      ) {
        payload.userPin =
          userPin.trim();
      }

      try {
        const res =
          await fetch(
            `${backendUrl}${endpoint}`,
            {
              method: "POST",

              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                payload,
              ),
            },
          );

        const data =
          await res.json();

        if (res.ok) {
          alert(
            "Operasyon an reyisi 🎉",
          );

          setClientEmail("");
          setAmount("");
          setUserPin("");

          setActiveAction(
            "NONE",
          );

          fetchAgentSpecs();
        } else {
          alert(
            data.message ||
              "Erè pandan operasyon an",
          );
        }
      } catch (err) {
        console.error(err);

        alert(
          "Erè rezo. Backend la pa reponn.",
        );
      } finally {
        setActionLoading(false);
      }
    };

  // =========================
  // LIQUIDITY REQUEST
  // =========================
  const handleLiquidityRequest =
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!liquidityAmount || parseFloat(liquidityAmount) <= 0) {
        alert("Montan invalide");
        return;
      }

      if (!liquidityAccountInfo.trim()) {
        alert("Enfòmasyon kont lan obligatwa");
        return;
      }

      setActionLoading(true);
      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`${backendUrl}/agents/liquidity-request`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: parseFloat(liquidityAmount),
            method: liquidityMethod,
            accountInfo: liquidityAccountInfo.trim(),
          }),
        });

        const data = await res.json();

        if (res.ok) {
          alert("Demand likidite voye avèk siksè ✅");
          setLiquidityAmount("");
          setLiquidityAccountInfo("");
          setActiveAction("NONE");
          fetchAgentSpecs();
        } else {
          alert(data.message || "Erè nan demand lan");
        }
      } catch (err) {
        console.error(err);
        alert("Erè rezo");
      } finally {
        setActionLoading(false);
      }
    };

  // =========================
  // LOADING
  // =========================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F121E] flex items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-[#FF7A00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F121E] text-white pb-12">
      {/* HEADER */}
      <header className="p-6 flex justify-between items-center max-w-md mx-auto border-b border-white/5">
        <button
          onClick={() =>
            (window.location.href =
              "/dashboard")
          }
          className="p-3 bg-white/5 rounded-2xl"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="text-center">
          <span className="text-[9px] font-black tracking-widest text-[#FF7A00] uppercase block">
            Ozama Pay
          </span>

          <h1 className="text-xs font-black uppercase italic">
            Agency Desk
          </h1>
        </div>

        <button
          onClick={
            fetchAgentSpecs
          }
          className="p-3 bg-white/5 rounded-2xl"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <main className="max-w-md mx-auto px-6 mt-6 space-y-6">

        {/* AGENT CARD */}
        <div className="bg-gradient-to-tr from-[#1E2544] to-[#0F121E] p-8 rounded-[2.5rem] border border-white/10">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-[#FF7A00]/10 text-[#FF7A00] px-3 py-1 rounded-full text-[8px] font-black uppercase">
                {agentData?.status}
              </span>

              <h2 className="text-xl font-black mt-3">
                {agentData?.businessName ||
                  "Ozama Point"}
              </h2>

              <p className="text-[9px] text-white/40 mt-1">
                {agentData?.agentCode}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[8px] uppercase text-gray-400">
                Balans
              </span>

              <div className="text-xl font-black">
                {parseFloat(
                  agentData?.wallet
                    ?.balance || 0,
                ).toLocaleString()}
                {" "}HTG
              </div>
            </div>
          </div>
        </div>

        {/* REFERRAL SYSTEM */}
        <div className="bg-[#161B30]/60 border border-white/5 rounded-[2rem] p-6 space-y-4">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-black">
                Referral Agent Link
              </p>

              <h3 className="text-sm font-black text-[#FF7A00] mt-1">
                {agentData?.agentCode}
              </h3>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-[#FF7A00]/10 flex items-center justify-center">
              <Landmark
                className="text-[#FF7A00]"
                size={20}
              />
            </div>
          </div>

          <div className="bg-[#0F121E] rounded-2xl p-4 border border-white/5">
            <p className="text-[10px] break-all text-white/70 leading-relaxed">
              {referralLink}
            </p>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(
                referralLink,
              );

              setCopied(true);

              setTimeout(() => {
                setCopied(false);
              }, 2000);
            }}
            className="w-full bg-[#FF7A00] hover:bg-[#ff8c1a] transition-all py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <CheckCircle2 size={16} />
                Link Copied
              </>
            ) : (
              <>
                <Copy size={16} />
                Copier Referral Link
              </>
            )}
          </button>
        </div>

        {/* ACTIONS */}
        {activeAction ===
        "NONE" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() =>
                  setActiveAction(
                    "TOPUP",
                  )
                }
                className="bg-green-600 p-6 rounded-[2rem] font-black"
              >
                <ArrowUpCircle className="mx-auto mb-2" />
                CASH IN
              </button>

              <button
                onClick={() =>
                  setActiveAction(
                    "WITHDRAW",
                  )
                }
                className="bg-red-600 p-6 rounded-[2rem] font-black"
              >
                <ArrowDownCircle className="mx-auto mb-2" />
                CASH OUT
              </button>
            </div>

            <button
              onClick={() =>
                setActiveAction(
                  "LIQUIDITY",
                )
              }
              className="w-full bg-white/5 p-5 rounded-2xl font-black flex items-center justify-center gap-2"
            >
              <Wallet size={16} />
              RETRÈ LIKIDITE
            </button>
          </div>
        ) : activeAction ===
          "LIQUIDITY" ? (
          <div className="bg-[#161B30] p-8 rounded-[2rem] space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-widest">
                Mande Likidite
              </h3>
              <span className="text-[9px] text-white/40 font-mono">
                Balans:{" "}
                <span className="text-[#FF7A00] font-black">
                  {parseFloat(agentData?.wallet?.balance || 0).toLocaleString()} HTG
                </span>
              </span>
            </div>

            <form onSubmit={handleLiquidityRequest} className="space-y-4">
              <input
                type="number"
                placeholder="Montan (HTG)"
                value={liquidityAmount}
                onChange={(e) => setLiquidityAmount(e.target.value)}
                className="w-full p-4 rounded-2xl bg-[#0F121E] text-white placeholder:text-white/30 outline-none border border-white/5 focus:border-[#FF7A00]/30 transition"
              />

              <select
                value={liquidityMethod}
                onChange={(e) => setLiquidityMethod(e.target.value as any)}
                className="w-full p-4 rounded-2xl bg-[#0F121E] text-white outline-none border border-white/5 focus:border-[#FF7A00]/30 transition cursor-pointer"
              >
                <option value="MONCASH">MonCash</option>
                <option value="ZELLE">Zelle</option>
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
              </select>

              <input
                type="text"
                placeholder="Nimewo / Detay kont (accountInfo)"
                value={liquidityAccountInfo}
                onChange={(e) => setLiquidityAccountInfo(e.target.value)}
                className="w-full p-4 rounded-2xl bg-[#0F121E] text-white placeholder:text-white/30 outline-none border border-white/5 focus:border-[#FF7A00]/30 transition"
              />

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-[#FF7A00] hover:bg-[#ff8c1a] py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition disabled:opacity-50"
              >
                {actionLoading ? "Loading..." : "Voye Demand →"}
              </button>
            </form>

            <button
              onClick={() => setActiveAction("NONE")}
              className="w-full py-3 rounded-2xl bg-white/5 text-white/40 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition"
            >
              Anile
            </button>
          </div>
        ) : (
          <div className="bg-white text-black p-8 rounded-[2.5rem]">
            <form
              onSubmit={
                handleAgentOperation
              }
              className="space-y-4"
            >
              <input
                type="email"
                placeholder="Email kliyan an"
                value={
                  clientEmail
                }
                onChange={(e) =>
                  setClientEmail(
                    e.target.value,
                  )
                }
                className="w-full p-4 rounded-2xl bg-gray-100"
              />

              {activeAction ===
                "WITHDRAW" && (
                <input
                  type="password"
                  placeholder="PIN kliyan an"
                  value={
                    userPin
                  }
                  onChange={(e) =>
                    setUserPin(
                      e.target.value,
                    )
                  }
                  maxLength={4}
                  className="w-full p-4 rounded-2xl bg-red-100 text-center tracking-[10px]"
                />
              )}

              <input
                type="number"
                placeholder="Montan"
                value={amount}
                onChange={(e) =>
                  setAmount(
                    e.target.value,
                  )
                }
                className="w-full p-4 rounded-2xl bg-gray-100"
              />

              <button
                type="submit"
                disabled={
                  actionLoading
                }
                className="w-full bg-[#0F121E] text-white py-5 rounded-2xl font-black"
              >
                {actionLoading
                  ? "Loading..."
                  : "Egzekite"}
              </button>
            </form>
          </div>
        )}

        {/* COMMISSIONS */}
        <div className="bg-[#161B30]/40 rounded-[2rem] border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4 opacity-50">
            <History size={14} />

            <h4 className="text-[9px] font-black uppercase">
              Historique
            </h4>
          </div>

          <div className="space-y-3">
            {commissions.length ===
            0 ? (
              <p className="text-center text-white/30 text-xs">
                Pa gen operasyon
              </p>
            ) : (
              commissions.map(
                (comm: any) => (
                  <div
                    key={comm.id}
                    className="p-4 bg-[#161B30] rounded-2xl flex justify-between"
                  >
                    <div>
                      <span className="text-[9px] uppercase text-gray-400 block">
                        {
                          comm.type
                        }
                      </span>

                      <span className="text-[8px] text-white/40">
                        {new Date(
                          comm.createdAt,
                        ).toLocaleDateString()}
                      </span>
                    </div>

                    <span className="text-green-400 font-black">
                      +
                      {
                        comm.amount
                      } HTG
                    </span>
                  </div>
                ),
              )
            )}
          </div>
        </div>
        {/* LIQUIDITY REQUESTS */}
        <div className="bg-[#161B30]/40 rounded-[2rem] border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Wallet size={14} className="opacity-50" />
            <h4 className="text-[9px] font-black uppercase tracking-widest opacity-50">
              Demand Likidite
            </h4>
          </div>

          <div className="space-y-3">
            {liquidityRequests.length === 0 ? (
              <p className="text-center text-white/30 text-xs py-4">
                Pa gen demand likidite pou kounye a
              </p>
            ) : (
              liquidityRequests.map((req: any) => (
                <div
                  key={req.id}
                  className="p-4 bg-[#161B30] rounded-2xl flex justify-between items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                          req.status === 'APPROVED'
                            ? 'bg-green-500/10 text-green-400'
                            : req.status === 'REJECTED'
                            ? 'bg-red-500/10 text-red-400'
                            : 'bg-[#FF7A00]/10 text-[#FF7A00]'
                        }`}
                      >
                        {req.status}
                      </span>
                      <span className="text-[8px] text-white/30 font-mono uppercase">
                        {req.method}
                      </span>
                    </div>
                    <p className="text-[9px] text-white/50 truncate">{req.accountInfo}</p>
                    {req.adminNote && (
                      <p className="text-[8px] text-white/30 mt-0.5 italic">"{req.adminNote}"</p>
                    )}
                    <p className="text-[8px] text-white/20 mt-1">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-black text-sm text-white shrink-0">
                    {Number(req.amount).toLocaleString()} HTG
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

      </main>
    </div>
  );
}