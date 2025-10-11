import React from "react";
import clsx from "clsx";
import {
  Button as MButton,
  Card as MCard,
  CardContent as MCardContent,
  Container as MContainer,
  Chip as MChip,
  TextField as MTextField,
  Select as MSelect,
  MenuItem as MMenuItem,
  Dialog as MDialog,
  DialogTitle as MDialogTitle,
  DialogContent as MDialogContent,
  DialogActions as MDialogActions,
  FormControl as MFormControl,
  InputLabel as MInputLabel,
} from "@mui/material";

// Accent bar helper
export function AccentBar({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "absolute inset-x-0 top-0 h-1",
        "bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400",
        className
      )}
    />
  );
}

/** Container — just adds default paddings */
export function Container(props: React.ComponentProps<typeof MContainer>) {
  const { className, ...rest } = props;
  return <MContainer className={clsx("px-4 py-6", className)} {...rest} />;
}

/** Card — dark surface with border and rounded-2xl */
export function Card(props: React.ComponentProps<typeof MCard> & { accent?: boolean }) {
  const { className, accent, children, ...rest } = props;
  return (
    <MCard
      className={clsx("relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]", className)}
      {...rest}
    >
      {accent && <AccentBar />}
      {children}
    </MCard>
  );
}
export const CardContent = MCardContent;

/** Button — gradient contained, subtle outlined */
export function Button(
  props: React.ComponentProps<typeof MButton> & { tone?: "primary" | "outline" | "ghost" }
) {
  const { className, tone = "primary", variant, ...rest } = props;

  const base =
    "rounded-xl font-semibold normal-case tracking-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";
  const primary =
    "bg-gradient-to-r from-fuchsia-500 via-rose-400 to-cyan-400 text-black hover:brightness-110";
  const outline =
    "border border-white/20 text-white hover:bg-white/10";
  const ghost =
    "text-white/80 hover:text-white hover:bg-white/10";

  const toneClass =
    tone === "primary" ? primary : tone === "outline" ? outline : ghost;

  return <MButton className={clsx(base, toneClass, className)} variant={variant ?? "text"} {...rest} />;
}

/** Chip — thin border on dark */
export function Chip(props: React.ComponentProps<typeof MChip>) {
  const { className, ...rest } = props;
  return <MChip className={clsx("text-white/80 border-white/20", className)} variant="outlined" {...rest} />;
}

/** TextField — style the input root and the native input with Tailwind */
export function TextField(
  props: React.ComponentProps<typeof MTextField> & { dense?: boolean }
) {
  const { className, dense, InputProps, inputProps, ...rest } = props;
  return (
    <MTextField
      variant="outlined"
      fullWidth
      margin={dense ? "dense" : "normal"}
      className={clsx(className)}
      InputLabelProps={{ className: "text-white/70" }}
      // InputBase root
      InputProps={{
        className:
          "rounded-xl bg-white/[0.06] border border-white/15 hover:border-white/25 focus-within:border-cyan-300/50",
        // native input
        inputProps: {
          className: "text-white placeholder:text-white/40",
          ...(inputProps || {}),
        },
        ...(InputProps || {}),
      }}
      {...rest}
    />
  );
}

/** Select — dark menu and trigger */
export function Select<T>(props: React.ComponentProps<typeof MSelect<T>>) {
  const { className, MenuProps, ...rest } = props as any;
  return (
    <MSelect
      className={clsx(
        "rounded-xl bg-white/[0.06] border border-white/15 hover:border-white/25 [&_.MuiSelect-select]:py-2 [&_.MuiSelect-select]:px-3",
        className
      )}
      MenuProps={{
        PaperProps: { className: "bg-[#0B0D13] text-white border border-white/10 rounded-xl" },
        ...(MenuProps || {}),
      }}
      {...(rest as any)}
    />
  );
}
export const MenuItem = MMenuItem;
export const FormControl = MFormControl;
export const InputLabel = MInputLabel;

/** Dialog — dark paper + rounded + subtle border */
export function Dialog(props: React.ComponentProps<typeof MDialog>) {
  const { PaperProps, ...rest } = props;
  return (
    <MDialog
      PaperProps={{
        className: "rounded-2xl border border-white/10 bg-[#0B0D13]",
        ...(PaperProps || {}),
      }}
      {...rest}
    />
  );
}
export const DialogTitle = MDialogTitle;
export const DialogContent = MDialogContent;
export const DialogActions = MDialogActions;
