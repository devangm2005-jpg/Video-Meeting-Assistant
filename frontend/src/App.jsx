import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import NewMeeting from "./pages/NewMeeting.jsx";
import Workspace from "./pages/Workspace.jsx";
import Documents from "./pages/Documents.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/new" element={<NewMeeting />} />
        <Route path="/workspace/:jobId" element={<Workspace />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
