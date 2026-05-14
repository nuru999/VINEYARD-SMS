import { hc } from "hono/client";
import Constants from "expo-constants";
import type { AppType } from "@template/web";

const baseUrl =
  Constants.expoConfig?.extra?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL;

const client = hc<AppType>(baseUrl!);

export const api = client.api;
