import { state } from "./state";
import { isTokenAuth } from "../features/auth/utils";
import { adminConfiguredText, adminText } from "./translations";

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
    return adminText("layout.user.apiKey", "API Key");
  }
  return adminText("layout.user.guest", "Guest");
};

export const headerCopy = (): HeaderCopy => ({
  title: adminConfiguredText(state.layoutConfig.header?.title, "layout.header.title", "Manage"),
  subtitle: adminConfiguredText(state.layoutConfig.header?.subtitle, "layout.header.subtitle", "Stateless Admin"),
  settingsLabel: adminConfiguredText(state.layoutConfig.header?.settingsLabel, "layout.header.settingsLabel", "Settings"),
  themeLabel: adminConfiguredText(state.layoutConfig.header?.themeLabel, "layout.header.themeLabel", "Theme"),
  createLabel: adminConfiguredText(state.layoutConfig.header?.createLabel, "layout.header.createLabel", "Create +"),
  profileLabel: adminConfiguredText(state.layoutConfig.header?.profileLabel, "layout.header.profileLabel", "Profile"),
  logoutLabel: adminConfiguredText(state.layoutConfig.header?.logoutLabel, "layout.header.logoutLabel", "Logout"),
});

export const sidebarCopy = (): SidebarCopy => ({
  publicLabel: adminConfiguredText(state.layoutConfig.sidebar?.publicLabel, "layout.sidebar.publicLabel", "Public"),
  privateLabel: adminConfiguredText(state.layoutConfig.sidebar?.privateLabel, "layout.sidebar.privateLabel", "Private"),
});

export const profileCopy = (): ProfileCopy => ({
  title: adminConfiguredText(state.layoutConfig.profile?.title, "layout.profile.title", "Profile"),
  subtitle: adminConfiguredText(state.layoutConfig.profile?.subtitle, "layout.profile.subtitle", "Update your profile info"),
  saveLabel: adminConfiguredText(state.layoutConfig.profile?.saveLabel, "layout.profile.saveLabel", "Save Profile"),
});
