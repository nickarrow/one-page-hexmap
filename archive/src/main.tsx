import { render } from 'preact';
import { App } from './app';
import './styles/index.css';
import './styles/map.css';
import './styles/print.css';

// Render the app
render(<App />, document.getElementById('app')!);
