import { getRequestConfig } from "next-intl/server";

// Single-locale setup (English only). When/if we add Chinese back,
// switch this to read from a cookie or Accept-Language header.
export default getRequestConfig(async () => {
  const locale = "en";
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
