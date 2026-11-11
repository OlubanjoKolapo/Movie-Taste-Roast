import { useEffect } from "react";
import { ToastProvider } from "./components/Dialog";
import { Grain } from "./components/ui";
import { useLocation } from "./lib/router";
import Landing from "./pages/Landing";
import PickPage from "./pages/PickPage";
import ResultPage from "./pages/ResultPage";

export default function App() {
  const location = useLocation();
  const url = new URL(location, window.location.origin);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  // Same-page anchors (/#demo) scroll once the page has rendered.
  useEffect(() => {
    if (!url.hash) return;
    const el = document.getElementById(url.hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [url.hash, path]);

  let page;
  const result = /^\/r\/([^/]+)$/.exec(path);
  if (result) page = <ResultPage slug={result[1]} fresh={url.searchParams.has("fresh")} />;
  else if (path === "/roast") page = <PickPage />;
  else page = <Landing />;

  return (
    <ToastProvider>
      {path === "/" && <Grain />}
      {page}
    </ToastProvider>
  );
}
