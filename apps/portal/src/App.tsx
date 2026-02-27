import { Switch, Route } from 'wouter';
import CaptivePortal from './pages/CaptivePortal';
import { PortalError } from './components/PortalError';

export default function App() {
  return (
    <Switch>
      <Route path="/portal/:slug" component={CaptivePortal} />
      <Route>
        <PortalError message="Aucun portail configuré pour cette URL. Vérifiez le lien fourni par votre administrateur réseau." />
      </Route>
    </Switch>
  );
}
