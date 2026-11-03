# QA manual — Vaults experimentales (selector Termius)

Prerrequisito: Ajustes → Seguridad → Vaults → activar «Vaults experimentales».

## Selector en title bar

- [ ] Con flag off no aparece el selector; el árbol es el de siempre.
- [ ] Con flag on, junto a «NodeTerm» hay un selector (Principal / vaults).
- [ ] Elegir un vault bloqueado abre el popup de clave; al acertar cambia el sidebar.
- [ ] Cambiar de vault **no cierra** pestañas SSH/RDP ya abiertas.

## Crear / usar

- [ ] «Nuevo vault…» desde el selector o Ajustes; tras crear salta a ese vault (árbol vacío).
- [ ] Crear hosts en TestVault; volver a Principal: solo se ven los hosts del principal.
- [ ] Volver a TestVault: se ven solo los de TestVault.
- [ ] Reinicio: vaults extra bloqueados salvo «recordar clave»; el activo se restaura.

## Export / import

- [ ] Exportar eligiendo un vault extra; importar «como vault nuevo» y desbloquearlo.

## Limpieza

- [ ] Eliminar vault desde Ajustes; si era el activo, vuelve a Principal.
