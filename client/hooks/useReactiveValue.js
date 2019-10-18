import { useState, useRef } from 'react';
import { Tracker } from 'meteor/tracker';

import { useAutorun } from './useAutorun';

export const useReactiveValue = (getValue, deps = []) => {
	const [value, setValue] = useState(() => Tracker.nonreactive(getValue));
	const firstRunRef = useRef(true); // computation.firstRun will reset when deps change

	useAutorun(() => {
		const newValue = getValue();

		if (firstRunRef.current) {
			firstRunRef.current = false;
			return;
		}

		setValue(() => newValue);
	}, deps);

	return value;
};
