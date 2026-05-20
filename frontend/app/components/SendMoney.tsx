"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SendMoney() {
  const [amount, setAmount] = useState("");

  const sendMoney = async () => {
    await fetch("http://localhost:3000/wallet/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: Number(amount),
        receiverId: "USER_ID",
      }),
    });
  };

  return (
    <Card className="w-full max-w-md rounded-2xl bg-zinc-900">
      <CardContent className="p-6">
        <p className="text-sm text-gray-400">Send Money</p>

        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="$0.00"
          className="w-full mt-4 text-2xl text-center bg-black p-3 rounded-lg"
        />

        <div className="grid grid-cols-3 gap-3 mt-6">
          {[1,2,3,4,5,6,7,8,9,0].map((num) => (
            <button
              key={num}
              onClick={() => setAmount(amount + num)}
              className="bg-zinc-800 rounded-xl py-4 text-lg"
            >
              {num}
            </button>
          ))}
        </div>

        <Button
          onClick={sendMoney}
          className="w-full mt-6 bg-yellow-500 text-black"
        >
          Send Money
        </Button>
      </CardContent>
    </Card>
  );
}<Button className="w-full mt-6 bg-[#D4AF37] text-black hover:scale-105 transition-all">
  Send Money
</Button>