
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { IonApp } from '@ionic/react';
import App from './App';

describe('App', () => {
  it('renders without crashing', () => {
    const { baseElement } = render(
      <IonApp>
        <App />
      </IonApp>
    );

    expect(baseElement).toBeTruthy();
  });
});
