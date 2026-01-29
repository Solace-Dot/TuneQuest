import React from "react";
import TopNav from "./TopNav";
import Footer from "./Footer";

function Layout({ children, hideNav }) {
  return (
    <div className="app-shell">
      {!hideNav && <TopNav />}
      <main className="content">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;
