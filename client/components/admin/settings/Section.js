import { useToggle } from '@rocket.chat/fuselage-hooks';
import React from 'react';

import { Button } from '../../basic/Button';
import { Icon } from '../../basic/Icon';
import { useTranslation } from '../../providers/TranslationProvider';
import { EditingState } from './EditingState';
import { SettingField } from './SettingField';

export function Section({ children, section, hasReset = true, help }) {
	const [collapsed, toggleCollapsed] = useToggle(!!section.name);
	const t = useTranslation();

	const handleTitleClick = () => {
		toggleCollapsed();
	};

	return <EditingState.WithSection key={section.name} section={section}>
		<div className={['section', collapsed && 'section-collapsed'].filter(Boolean).join(' ')}>
			{section.name && <div className='section-title' onClick={handleTitleClick}>
				<div className='section-title-text'>{t(section.name)}</div>
				<div className='section-title-right'>
					<Button nude title={collapsed ? t('Expand') : t('Collapse')}>
						<Icon icon={collapsed ? 'icon-angle-down' : 'icon-angle-up'} />
					</Button>
				</div>
			</div>}

			<div className='section-content border-component-color'>
				{help && <div className='section-helper'>{help}</div>}

				{section.settings.map((setting) => <SettingField key={setting._id} setting={setting} />)}

				{hasReset && <div className='input-line double-col'>
					<label className='setting-label'>{t('Reset_section_settings')}</label>
					<div className='setting-field'>
						<Button cancel data-section={section.name} className='reset-group'>
							{t('Reset')}
						</Button>
					</div>
				</div>}

				{children}
			</div>
		</div>
	</EditingState.WithSection>;
}
