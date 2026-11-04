import React, { useEffect } from 'react';

import {
  IonApp,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';

import { IonReactRouter } from '@ionic/react-router';
import { Navigate, Route, useLocation } from 'react-router-dom';

import {
  homeOutline,
  cubeOutline,
  listOutline,
} from 'ionicons/icons';

import Dashboard from './pages/Dashboard/Dashboard';
import Products from './pages/Products/Products';
import ProductList from './pages/ProductList/ProductList';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import './theme/variables.css';

setupIonicReact();

// Tanggalin ang focus sa dating page kapag lumilipat ng route.
const RouteFocusReset: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const activeElement = document.activeElement;

    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, [location.pathname]);

  return null;
};

const App: React.FC = () => {
  return (
    <IonApp>
      <IonReactRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <RouteFocusReset />

        <IonTabs>
          <IonRouterOutlet>
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/products"
              element={<Products />}
            />

            <Route
              path="/product-list"
              element={<ProductList />}
            />

            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
          </IonRouterOutlet>

          <IonTabBar slot="bottom" color="light">
            <IonTabButton
              tab="dashboard"
              href="/dashboard"
            >
              <IonIcon icon={homeOutline} />
              <IonLabel>Dashboard</IonLabel>
            </IonTabButton>

            <IonTabButton
              tab="products"
              href="/products"
            >
              <IonIcon icon={cubeOutline} />
              <IonLabel>Products</IonLabel>
            </IonTabButton>

            <IonTabButton
              tab="product-list"
              href="/product-list"
            >
              <IonIcon icon={listOutline} />
              <IonLabel>Product List</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
};

export default App;