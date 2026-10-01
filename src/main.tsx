import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { APP_VERSION, GIT_COMMIT, BUILD_DATE } from './generated/version'

console.info(
  `[captive-spark-portal] v${APP_VERSION} · commit ${GIT_COMMIT} · build ${BUILD_DATE}`
);

createRoot(document.getElementById("root")!).render(<App />);
