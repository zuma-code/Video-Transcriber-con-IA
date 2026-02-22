import {getRequestConfig} from "next-intl/server";
import {cookies, headers} from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requestHeaders = await headers();

  const localeCookie = cookieStore.get("locale")?.value;
  const acceptLanguage = requestHeaders.get("accept-language");

  let locale = localeCookie || "en";

  if (!localeCookie && acceptLanguage?.toLowerCase().startsWith("es")) {
    locale = "es";
  }

  if (locale !== "en" && locale !== "es") {
    locale = "en";
  }

  const messages = (await import(`./messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});

