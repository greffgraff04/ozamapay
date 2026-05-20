"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Send, ArrowDownLeft, ArrowUpRight, CreditCard } from "lucide-react";

function Action({ icon, label }: any) {
  return (
    <div className="flex flex-col items-center text-xs">
      <div className="bg-black/20 p-2 rounded-lg mb-1">{icon}</div>
      {label}
    </div>
  );
}

export default function BalanceCard() {
  return (
    <Card className="w-full max-w-md rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-700 text-black">
      <CardContent className="p-6">
        <p className="text-sm opacity-70">Total Balance</p>
        <h1 className="text-3xl font-bold mt-2">$23,590.73</h1>

        <div className="flex justify-between mt-6">
          <Action icon={<Send size={18} />} label="Send" />
          <Action icon={<ArrowDownLeft size={18} />} label="Request" />
          <Action icon={<ArrowUpRight size={18} />} label="Pay" />
          <Action icon={<CreditCard size={18} />} label="Card" />
        </div>
      </CardContent>
    </Card>
  );
}