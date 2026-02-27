import { render } from 'preact';
import { App } from './app';
import './styles/index.css';
import './styles/map.css';
import './styles/print.css';

// Wait for OI.hexmap to be available
function init() {
  if (typeof OI !== 'undefined') {
    render(<App />, document.getElementById('app')!);
  } else {
    // Retry after a short delay
    setTimeout(init, 100);
  }
}

init();
