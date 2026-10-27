import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { InputTextarea } from 'primereact/inputtextarea';
import { useTranslation } from '../../i18n/hooks/useTranslation';

export function PasswordCreateForm({ foldersOptions = [], onCreate }) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');
  
  const [title, setTitle] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [group, setGroup] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [targetFolder, setTargetFolder] = React.useState(null);
  const [showPassword, setShowPassword] = React.useState('');

  const canCreate = title.trim().length > 0;

  return (
    <div className="p-fluid" style={{ padding: '12px' }}>
      <div className="formgrid grid">
        <div className="field col-12">
          <label htmlFor="pwdTitle">{t('passwordManager.fields.title')} *</label>
          <InputText id="pwdTitle" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('passwordManager.placeholders.title')} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdUser">{t('passwordManager.fields.username')}</label>
          <InputText id="pwdUser" value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdPass">{t('passwordManager.fields.password')}</label>
          <div className="p-inputgroup">
            <InputText 
              id="pwdPass" 
              type={showPassword ? "text" : "password"} 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <Button 
              type="button" 
              icon={showPassword ? "pi pi-eye-slash" : "pi pi-eye"} 
              className="p-button-outlined"
              onClick={() => setShowPassword(!showPassword)}
              tooltip={showPassword ? t('passwordManager.tooltips.hidePassword') : t('passwordManager.tooltips.showPassword')}
              tooltipOptions={{ position: 'top' }}
            />
          </div>
        </div>
        <div className="field col-12">
          <label htmlFor="pwdUrl">{t('passwordManager.fields.url')}</label>
          <InputText id="pwdUrl" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t('passwordManager.placeholders.url')} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdGroup">{t('passwordManager.fields.group')}</label>
          <InputText id="pwdGroup" value={group} onChange={(e) => setGroup(e.target.value)} />
        </div>
        <div className="field col-6">
          <label htmlFor="pwdFolder">{t('passwordManager.fields.folder')}</label>
          <Dropdown
            id="pwdFolder"
            value={targetFolder}
            options={foldersOptions}
            onChange={(e) => setTargetFolder(e.value)}
            placeholder={t('passwordManager.placeholders.folder')}
            optionLabel="label"
            optionValue="key"
          />
        </div>
        <div className="field col-12">
          <label htmlFor="pwdNotes">{t('passwordManager.fields.notes')}</label>
          <InputTextarea id="pwdNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>
      </div>
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <Button
          label={tCommon('buttons.create')}
          icon="pi pi-plus"
          onClick={() => {
            if (canCreate && onCreate) {
              onCreate({
                title,
                username,
                password,
                url,
                group,
                notes,
                targetFolder
              });
            }
          }}
          disabled={!canCreate}
          className="p-button-success"
        />
      </div>
    </div>
  );
}
