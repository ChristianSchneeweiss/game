import type { ComponentProps } from "react";
import type { ClerkProvider } from "@clerk/clerk-react";

/** Shared by sign-in, registration, the user menu and account management. */
export const clerkAppearance = {
  variables: {
    colorPrimary: "var(--rpg-gold)",
    colorTextOnPrimaryBackground: "var(--rpg-bg-0)",
    colorBackground: "var(--rpg-panel-stone)",
    colorText: "var(--rpg-text-main)",
    colorTextSecondary: "var(--rpg-text-muted)",
    colorNeutral: "#eee8d5",
    colorInputBackground: "var(--rpg-bg-0)",
    colorInputText: "var(--rpg-text-main)",
    colorDanger: "var(--rpg-danger)",
    colorSuccess: "var(--rpg-success)",
    colorWarning: "var(--rpg-warning)",
    fontFamily: "var(--rpg-font-body)",
    fontFamilyButtons: "var(--rpg-font-display)",
    fontSize: "0.9375rem",
    borderRadius: "2px",
  },
  elements: {
    cardBox: "sanctum-account-frame",
    userButtonPopoverCard: "sanctum-account-frame",
    card: { background: "var(--rpg-panel-stone)" },
    navbar: { background: "var(--rpg-bg-1)" },
    pageScrollBox: { background: "var(--rpg-panel-stone)" },
    footer: { background: "var(--rpg-bg-1)" },
    userButtonPopoverFooter: { background: "var(--rpg-bg-1)" },
    headerTitle: { fontFamily: "var(--rpg-font-display)" },
    formButtonPrimary: { color: "var(--rpg-bg-0)" },
    modalBackdrop: { background: "#080d0bc9" },
  },
} satisfies ComponentProps<typeof ClerkProvider>["appearance"];
