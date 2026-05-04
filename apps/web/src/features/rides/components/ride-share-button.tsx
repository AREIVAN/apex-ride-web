"use client";

import { useState } from "react";

import { RideShareModal } from "@/features/rides/components/ride-share-modal";
import { Button } from "@/features/shared/ui/button";
import type { RideShareData } from "@/features/rides/lib/ride-share-export";

interface RideShareButtonProps {
  data: RideShareData;
}

export function RideShareButton({ data }: RideShareButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Compartir</Button>
      <RideShareModal data={data} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
