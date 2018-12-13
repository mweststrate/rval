import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';

import Canvas from './components/canvas';
import { createBoxesStore } from './stores/domain-state';
import { trackChanges } from "./stores/time";

const store = createBoxesStore()

trackChanges(store)

ReactDOM.render(<Canvas store={store}/>, document.getElementById('root'));
