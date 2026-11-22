import DemoNotice from "@/components/shell/DemoNotice";
import SiteHeader from "./SiteHeader";
import Footer from "./Footer";
import CookieNotice from "./CookieNotice";

/** Header + footer wrapper used by the home page and the public info pages. */
export default function PublicShell({ children, home = false }: { children: React.ReactNode; home?: boolean }) {
  return (
    <div className="min-h-screen bg-white">
      <DemoNotice />
      <SiteHeader home={home} />
      <main id="main">{children}</main>
      <Footer />
      <CookieNotice />
    </div>
  );
}
