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

/* ---------- Layout ---------- */

export function Container(props: React.ComponentProps<typeof MContainer>) {
  const { className, ...rest } = props;
  return <MContainer className={clsx("px-5 py-6 md:py-8", className)} {...rest} />;
}

export function Card(
  props: React.ComponentProps<typeof MCard> & { inset?: boolean }
) {
  const { className, inset, children, ...rest } = props;
  return (
    <MCard
      className={clsx(
        // muted surface and consistent border + shadow
        "relative overflow-hidden rounded-[var(--radius)] border",
        "border-[rgb(var(--border))] bg-[color:var(--surface)] shadow-[var(--shadow-soft)]",
        inset && "md:mx-[-8px]",
        className
      )}
      {...rest}
    >
      {children}
    </MCard>
  );
}

/** Padded content (prevents text clipping everywhere) */
export function CardContent(
  props: React.ComponentProps<typeof MCardContent> & { dense?: boolean }
) {
  const { className, dense, ...rest } = props;
  return (
    <MCardContent
      className={clsx(
        dense ? "!px-4 !py-3" : "!px-5 !py-5 md:!px-6 md:!py-6",
        className
      )}
      {...rest}
    />
  );
}

/* ---------- Buttons ---------- */

type Tone = "primary" | "subtle" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function Button(
  props: React.ComponentProps<typeof MButton> & { tone?: Tone; size?: Size }
) {
  const { className, tone = "primary", size = "md", ...rest } = props;

  const base =
    "rounded-[12px] font-semibold tracking-tight normal-case transition " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]";

  const tones: Record<Tone, string> = {
    primary:
      "bg-[color:var(--accent)] text-black hover:bg-[color:var(--accent-600)]",
    subtle:
      "border border-[rgb(var(--border))] text-[color:var(--text)] bg-transparent hover:bg-white/5",
    ghost:
      "text-[color:var(--text)]/80 hover:text-[color:var(--text)] hover:bg-white/5",
    danger:
      "bg-[#ef4444] text-white hover:bg-[#dc2626]",
  };

  const sizes: Record<Size, string> = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-5 py-3 text-[15px]",
  };

  return (
    <MButton
      variant="text"
      className={clsx(base, tones[tone], sizes[size], className)}
      {...rest}
    />
  );
}

/* ---------- Chips ---------- */

export function Chip(props: React.ComponentProps<typeof MChip>) {
  const { className, ...rest } = props;
  return (
    <MChip
      variant="outlined"
      className={clsx(
        "text-[color:var(--text)]/85 border-[rgb(var(--border))] bg-transparent",
        className
      )}
      {...rest}
    />
  );
}

/* ---------- Inputs (TextField / Select) ---------- */

export function TextField(
  props: React.ComponentProps<typeof MTextField> & { dense?: boolean }
) {
  const { className, dense, InputProps, inputProps, ...rest } = props;

  return (
    <MTextField
      variant="outlined"
      fullWidth
      size={dense ? "small" : "medium"}
      margin={dense ? "dense" : "normal"}
      className={clsx(className)}
      InputLabelProps={{ className: "text-[color:var(--muted)]" }}
      InputProps={{
        className:
          // surface + padding + border + focus ring (no gradients)
          "rounded-[12px] bg-[color:var(--surface-2)] " +
          "border border-[rgb(var(--border))] " +
          "hover:border-white/20 " +
          "focus-within:ring-2 focus-within:ring-[color:var(--accent)] focus-within:border-transparent " +
          // inner input padding
          "[&_.MuiInputBase-input]:py-2.5 [&_.MuiInputBase-input]:px-3 md:[&_.MuiInputBase-input]:py-3 md:[&_.MuiInputBase-input]:px-3.5",
        inputProps: {
          className: "text-[color:var(--text)] placeholder:text-[color:var(--muted)]/70",
          ...(inputProps || {}),
        },
        ...(InputProps || {}),
      }}
      {...rest}
    />
  );
}

export function Select<T>(props: React.ComponentProps<typeof MSelect<T>>) {
  const { className, MenuProps, ...rest } = props as any;
  return (
    <MSelect
      className={clsx(
        "rounded-[12px] bg-[color:var(--surface-2)] " +
          "border border-[rgb(var(--border))] hover:border-white/20 " +
          "[&_.MuiSelect-select]:py-2.5 [&_.MuiSelect-select]:px-3 md:[&_.MuiSelect-select]:py-3 md:[&_.MuiSelect-select]:px-3.5",
        className
      )}
      MenuProps={{
        PaperProps: {
          className:
            "rounded-[12px] border border-[rgb(var(--border))] bg-[color:var(--surface)] text-[color:var(--text)]",
        },
        ...(MenuProps || {}),
      }}
      {...(rest as any)}
    />
  );
}
export const MenuItem = MMenuItem;
export const FormControl = MFormControl;
export const InputLabel = MInputLabel;

/* ---------- Dialogs ---------- */

export function Dialog(props: React.ComponentProps<typeof MDialog>) {
  const { PaperProps, ...rest } = props;
  return (
    <MDialog
      PaperProps={{
        className:
          "rounded-[var(--radius)] border border-[rgb(var(--border))] bg-[color:var(--surface)]",
        ...(PaperProps || {}),
      }}
      {...rest}
    />
  );
}
export const DialogTitle = MDialogTitle;
export const DialogContent = MDialogContent;
export const DialogActions = MDialogActions;
