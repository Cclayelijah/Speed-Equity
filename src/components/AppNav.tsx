import React from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { Sparkles, Menu as MenuIcon } from "lucide-react";
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Menu,
  useMediaQuery,
  Theme,
} from "@mui/material";
import { Button } from "@/components/ui/brand";

type Props = { scrolled: boolean; title: string };

export default function AppNav({ scrolled, title }: Props) {
  const isMdUp = useMediaQuery((theme: Theme) => theme.breakpoints.up("md"));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const actions = useNavActions(title);

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  return (
    <AppBar
      position="sticky"
      color="transparent"
      elevation={0}
      className={[
        "relative w-full transition-colors duration-300 border-b",
        scrolled
          ? "bg-[#05060A]/85 backdrop-blur-md border-white/20"
          : "bg-[#05060A]/0 border-transparent",
      ].join(" ")}
    >
      <Toolbar className="mx-auto h-16 max-w-7xl !px-5">
        {/* Brand */}
        <Box component={RouterLink} to="/" className="inline-flex items-center gap-2 no-underline group">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-400 shadow-[0_0_40px_-8px] shadow-fuchsia-500/40">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <Typography className="text-lg font-semibold tracking-tight text-white">
            sweaty<span className="text-fuchsia-400">.dev</span>
          </Typography>
        </Box>

        {/* Title (md+) */}
        <Box className="items-center flex-1 hidden ml-4 md:flex">
          <Typography variant="h5" className="font-black tracking-tight">
            {title}
          </Typography>
        </Box>

        {/* Actions */}
        {isMdUp ? (
          <Box className="flex items-center gap-2 ml-auto">
            {actions.map((a) => (
              <Button
                key={a.label}
                tone="outline"
                onClick={a.onClick}
                className="px-4 py-2 text-white/85 hover:text-white hover:!bg-white/10 border-white/20"
              >
                {a.label}
              </Button>
            ))}
          </Box>
        ) : (
          <>
            <IconButton
              onClick={openMenu}
              className="ml-auto rounded-xl text-white/85 hover:bg-white/10"
              aria-label="Open menu"
            >
              <MenuIcon className="w-5 h-5" />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={closeMenu}
              PaperProps={{
                className: "bg-[#0B0D13] text-white border border-white/10 rounded-xl",
              }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
              <div className="p-1">
                {actions.map((a) => (
                  <Button
                    key={a.label}
                    tone="ghost"
                    onClick={() => {
                      closeMenu();
                      a.onClick();
                    }}
                    className="!w-full justify-start rounded-lg px-3 py-2 text-white/85 hover:text-white hover:!bg-white/10"
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
            </Menu>
          </>
        )}
      </Toolbar>
    </AppBar>
  );
}

/** Centralized action mapping to keep logic identical to your original */
function useNavActions(title: string) {
  const navigate = useNavigate();
  switch (title) {
    case "Dashboard":
      return [
        { label: "Check-In", onClick: () => navigate("/checkin") },
        { label: "Profile", onClick: () => navigate("/settings") },
      ];
    default:
      return [{ label: "Dashboard", onClick: () => navigate("/dashboard") }];
  }
}
