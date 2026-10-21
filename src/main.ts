import './styles/tokens.css';
import './styles/app.css';
import { mountApp } from './ui/app';
import { appMode, isEmbed } from './ui/runtime';

const root = document.querySelector<HTMLElement>('#app');
if (root) {
  mountApp(root, { mode: appMode(import.meta.env.MODE), embed: isEmbed(location.search) });
}
