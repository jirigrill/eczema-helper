import { mount } from 'svelte';

import App from './App.svelte';
import './theme.css';

const target = document.getElementById('app');
if (!target) throw new Error('#app mount target missing');

mount(App, { target });
