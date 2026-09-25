# Checklist manual de accesibilidad (E19)

La automatización (axe sin serious/critical, ruta solo-teclado, zoom 200 %) no
certifica accesibilidad completa. La matriz de 06-tdd §6.5 exige revisión manual
y una prueba con lector de pantalla **registrada por persona**. Este checklist
enumera exactamente lo que falta y el criterio de cierre.

## Estado

- Fecha de creación: 2026-09-25.
- **Pendiente de persona.** Ningún ítem de este checklist está certificado por
  automatización. Marcar un ítem requiere nombre, fecha y navegador del
  revisor, con la evidencia observada.

## 1. Revisión manual de foco, contraste y reflow

Recorrer Studio (light y dark, es y en) con:

- [ ] **Foco:** tab completa por toolbar, outline, inspector y JSON panel;
      orden lógico, anillo visible a 1x y 200 % de zoom, sin trampas de teclado,
      `Escape` devuelve el foco al editor.
- [ ] **Contraste:** WCAG AA (4.5:1 texto, 3:1 UI) en controles, texto del
      canvas, outline y mensajes de estado en ambos temas; verificado de forma
      independiente de axe.
- [ ] **Reflow:** 320 px de ancho sin scroll horizontal ni controles perdidos;
      reflujo a 400/768/1280 px; zoom de página 200 % sin clipping (el test
      automatizado T44.2 es evidencia complementaria, no sustituye la revisión).

Evidencia esperada: navegador + resolución + lista de elementos revisados y
cualquier excepción aprobada con su motivo.

## 2. Lector de pantalla registrado por persona

Elegir una de las dos combinaciones (la otra queda documentada como pendiente
hasta su ejecución):

- [ ] **VoiceOver/Safari (macOS):** abrir Studio, navegar outline y canvas,
      crear un nodo y anunciar su selección; leer el inspector y los mensajes
      de exportación.
- [ ] **NVDA/Firefox (Windows):** mismo recorrido.

Criterio: el flujo T44.1 (crear→editar→mover→conectar→borrar→undo→guardar→
exportar) es realizable sin puntero y cada acción se anuncia en el idioma
seleccionado.

## 3. IME: nativo por CDP frente a composición simulada

- [ ] La cobertura de IME en Chromium usa `imeSetComposition` + `insertText`
      por CDP (driver de composición del sistema operativo).
- [ ] Firefox/WebKit ejercitan eventos de composición DOM explícitamente
      anotados (`tests/e2e/editor-crud.e2e.ts`), **no** un IME de sistema.
- [ ] El informe de ejecución y este checklist mantienen esa distinción;
      ningún gate declara IME nativo en motores donde no se ejecutó.

## 4. Gates de interfaces M2

- [ ] Cuando existan viewer (E13), vistas/story (E14) y HTML offline (E16),
      ampliar este checklist y la matriz axe/keyboard a esas superficies antes
      de cerrar E19.