"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createWorkspaceAction } from "@/actions/workspace";

export function CreateWorkspaceButton({
  title,
  description,
  nameLabel,
  namePlaceholder,
  createLabel,
}: {
  title: string;
  description: string;
  nameLabel: string;
  namePlaceholder: string;
  createLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function action(formData: FormData) {
    setPending(true);
    try {
      await createWorkspaceAction(String(formData.get("name") ?? ""));
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" />}>
        <Plus className="size-4" />
        <span className="sr-only">{title}</span>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <form action={action} className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="workspace-name" className="text-sm font-medium">
              {nameLabel}
            </label>
            <Input
              id="workspace-name"
              name="name"
              required
              autoFocus
              placeholder={namePlaceholder}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {createLabel}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
