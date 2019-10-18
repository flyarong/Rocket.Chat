import React from 'react';

import { useSettingsGroupSections } from '../EditingState';
import { GroupPage } from '../GroupPage';
import { Section } from '../Section';

export function GenericGroupPage() {
	const sections = useSettingsGroupSections();

	return <GroupPage>
		{sections.map((section) => <Section key={section.name} section={section} />)}
	</GroupPage>;
}
