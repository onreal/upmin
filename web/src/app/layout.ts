import { state } from "./state";
import { isTokenAuth } from "../features/auth/utils";

export type HeaderCopy = {
  title: string;
  subtitle: string;
  settingsLabel: string;
  themeLabel: string;
  createLabel: string;
  profileLabel: string;
  logoutLabel: string;
};

export type SidebarCopy = {
  publicLabel: string;
  privateLabel: string;
};

export type ProfileCopy = {
  title: string;
  subtitle: string;
  saveLabel: string;
};

export const getUserLabel = () => {
  if (isTokenAuth(state.auth) && state.auth.user) {
    const name = `${state.auth.user.firstname} ${state.auth.user.lastname}`.trim();
    return name || state.auth.user.email;
  }
  if (state.auth?.type === "apiKey") {
    return "API Key";
  }
  return "Guest";
};

export const headerCopy = (): HeaderCopy => ({
  title: state.layoutConfig.header?.title ?? "Manage",
  subtitle: state.layoutConfig.header?.subtitle ?? "Stateless Admin",
  settingsLabel: state.layoutConfig.header?.settingsLabel ?? "Settings",
  themeLabel: state.layoutConfig.header?.themeLabel ?? "Theme",
  createLabel: state.layoutConfig.header?.createLabel ?? "Create +",
  profileLabel: state.layoutConfig.header?.profileLabel ?? "Profile",
  logoutLabel: state.layoutConfig.header?.logoutLabel ?? "Logout",
});

export const sidebarCopy = (): SidebarCopy => ({
  publicLabel: state.layoutConfig.sidebar?.publicLabel ?? "Public",
  privateLabel: state.layoutConfig.sidebar?.privateLabel ?? "Private",
});

export const profileCopy = (): ProfileCopy => ({
  title: state.layoutConfig.profile?.title ?? "Profile",
  subtitle: state.layoutConfig.profile?.subtitle ?? "Ενημερώστε τα στοιχεία σας.",
  saveLabel: state.layoutConfig.profile?.saveLabel ?? "Save Profile",
});
