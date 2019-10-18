import { useDebouncedCallback } from '@rocket.chat/fuselage-hooks';
import { Mongo } from 'meteor/mongo';
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

import { settings } from '../../../../app/settings/lib/settings';
import { PrivateSettingsCachedCollection } from '../../../../app/ui-admin/client/SettingsCachedCollection';
import { useAutorun } from '../../../hooks/useAutorun';
import { useReactiveValue } from '../../../hooks/useReactiveValue';

const SettingsEditingContext = createContext({});
SettingsEditingContext.displayName = 'SettingsEditingContext';

export function EditingState({ children, groupId }) {
	const persistedCollection = useMemo(() => {
		const cachedCollection = new PrivateSettingsCachedCollection();
		cachedCollection.init();
		return cachedCollection.collection;
	}, []);

	const temporaryCollection = useMemo(() => new Mongo.Collection(null), []);

	useEffect(() => {
		const queryHandle = persistedCollection.find().observe({
			added: (data) => {
				temporaryCollection.insert(data);
			},
			changed: (data) => {
				temporaryCollection.update(data._id, data);
			},
			removed: (data) => {
				temporaryCollection.remove(data._id);
			},
		});

		return () => {
			queryHandle.stop();
		};
	}, []);

	const group = useReactiveValue(() => temporaryCollection.findOne({ _id: groupId, type: 'group' }), [groupId]);
	const changed = useReactiveValue(() => !!temporaryCollection.findOne({ group: groupId, changed: true }));

	const sections = useReactiveValue(() => Object.values(
		temporaryCollection
			.find({ group: groupId }, { sort: { section: 1, sorter: 1, i18nLabel: 1 } })
			.fetch()
			.reduce((sections, setting) => {
				const name = setting.section || '';
				const section = sections[name] || { name };
				section.changed = section.changed || setting.changed;
				section.settings = (section.settings || []).concat(setting);

				return {
					...sections,
					[name]: section,
				};
			}, {})
	), [groupId]);

	const contextValue = useMemo(() => ({
		persistedCollection,
		temporaryCollection,
		group: group ? { ...group, changed } : undefined,
		sections,
	}), [
		persistedCollection,
		temporaryCollection,
		group,
		changed,
		sections,
	]);

	return <SettingsEditingContext.Provider value={contextValue}>
		{children}
	</SettingsEditingContext.Provider>;
}

EditingState.WithSection = function WithSection({ children, section }) {
	const upperContextValue = useContext(SettingsEditingContext);

	const { temporaryCollection, group } = upperContextValue;
	const changed = useReactiveValue(() => !!temporaryCollection.findOne({
		group: group._id,
		changed: true,
		...section.name === ''
			? { $or: [{ section: '' }, { section: { $exists: false } }] }
			: { section: section.name },
	}));

	const contextValue = useMemo(() => ({
		...upperContextValue,
		section: section ? { ...section, changed } : undefined,
	}), [upperContextValue]);

	return <SettingsEditingContext.Provider value={contextValue}>
		{children}
	</SettingsEditingContext.Provider>;
};

export const useSettingsGroup = () => useContext(SettingsEditingContext).group;

export const useSettingsGroupActions = () => {
	const {
		persistedCollection,
		temporaryCollection,
		group,
	} = useContext(SettingsEditingContext);

	const resetGroup = () => {
		temporaryCollection
			.find({
				group: group._id,
				changed: true,
			}, { fields: {} })
			.map(({ _id }) => persistedCollection.findOne({ _id }, { fields: { _id: 1, value: 1, editor: 1 } }))
			.forEach(({ _id, value, editor }) => {
				temporaryCollection.update({ _id }, { $set: { value, editor, changed: false } });
			});
	};

	const saveGroup = () => new Promise((resolve, reject) => {
		const changedSettings = temporaryCollection
			.find({
				group: group._id,
				changed: true,
			}, { fields: { _id: 1, value: 1, editor: 1 } })
			.fetch();

		if (changedSettings.length === 0) {
			return resolve(false);
		}

		settings.batchSet(changedSettings, (error) => {
			if (error) {
				changedSettings
					.filter(({ _id }) => !error.details.settingIds.includes(_id))
					.forEach(({ _id }) => temporaryCollection.update({ _id }, { $unset: { changed: 1 } }));
				return reject(error);
			}

			changedSettings.forEach(({ _id }) => temporaryCollection.update({ _id }, { $unset: { changed: 1 } }));
		});


		// 	if (rcSettings.some(({ _id }) => _id === 'Language')) {
		// 		const lng = Meteor.user().language
		// 			|| rcSettings.filter(({ _id }) => _id === 'Language').shift().value
		// 			|| 'en';
		// 		return TAPi18n._loadLanguage(lng).then(() => toastr.success(TAPi18n.__('Settings_updated', { lng })));
		// 	}
		// 	toastr.success(TAPi18n.__('Settings_updated'));
		// });
	});

	return { resetGroup, saveGroup };
};

export const useSettingsGroupSections = () => useContext(SettingsEditingContext).sections;

export const useCurrentSettingsGroupSection = () => useContext(SettingsEditingContext).section;

export const useSettingProps = ({ _id, blocked, enableQuery }) => {
	const {
		persistedCollection,
		temporaryCollection,
	} = useContext(SettingsEditingContext);

	const persistedSetting = useReactiveValue(() => persistedCollection.findOne(_id), [_id]);

	const [state, setState] = useState(persistedSetting);

	const updateAtCollection = useDebouncedCallback((data) => {
		temporaryCollection.update({ _id }, { $set: data });
	}, 70, [_id]);

	useAutorun(() => {
		const { value, editor, changed } = temporaryCollection.findOne({ _id },
			{ fields: { value: 1, editor: 1, changed: 1 } });

		setState((state) => ({ ...state, value, editor, changed }));
	}, [_id]);

	const disabled = useReactiveValue(() => {
		if (blocked) {
			return true;
		}

		if (!enableQuery) {
			return false;
		}

		const queries = [].concat(typeof enableQuery === 'string' ? JSON.parse(enableQuery) : enableQuery);

		return !queries.every((query) => !!temporaryCollection.findOne(query));
	}, [blocked, enableQuery]);

	const onChange = (data) => {
		const changed = Object.entries(data).some(([key, value]) => persistedSetting[key] !== value);
		setState((state) => ({ ...state, ...data, changed }));
		updateAtCollection({ ...data, changed });
	};

	const onReset = () => onChange(persistedSetting);

	return {
		...state,
		disabled,
		onChange,
		onReset,
	};
};
