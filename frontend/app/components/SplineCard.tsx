'use client';

import dynamic from 'next/dynamic';

const Spline = dynamic(
  () => import('@splinetool/react-spline'),
  {
    ssr: false,
  }
);

export default function SplineCard() {
  return (
    <Spline scene="https://prod.spline.design/bRnTc63tDzZ3spUH/scene.splinecode" />
  );
}