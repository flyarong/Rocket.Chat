import React from 'react';

import { Button } from '../../../basic/Button';
import { useTranslation } from '../../../providers/TranslationProvider';
import { useSettingsGroupSections } from '../EditingState';
import { GroupPage } from '../GroupPage';
import { Section } from '../Section';

export function AssetsGroupPage() {
	const t = useTranslation();

	const sections = useSettingsGroupSections();

	return <GroupPage headerButtons={<>
		<Button secondary className='refresh-clients'>{t('Apply_and_refresh_all_clients')}</Button>
	</>}>
		{sections.map((section) => <Section key={section.name} section={section} hasReset={false} />)}
	</GroupPage>;
}
