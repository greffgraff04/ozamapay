import { Card, CardContent } from "@/components/ui/card";

export default function CardPreview() {
  return (
    <Card className="w-full max-w-md rounded-2xl bg-gradient-to-r from-green-400 to-green-600 text-black">
      <CardContent className="p-6">
        <p className="text-sm opacity-70">OZAMA CARD</p>
        <h2 className="text-xl font-semibold mt-2">Ralph Greffin</h2>
        <p className="mt-4 text-sm">**** **** **** 3501</p>
      </CardContent>
    </Card>
  );
}