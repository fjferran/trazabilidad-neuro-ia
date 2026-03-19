# Procedimiento Operativo Estándar (SOP)
## 📝 Trazabilidad Cannábica Integral (6 Niveles)

| Empresa: Neuro-IA | Código: SOP-TRA-001 | Versión: 3.0 |
|-------------------|---------------------|--------------|
| **Título:** Gestión de Trazabilidad desde Genética hasta Cosecha | **Fecha Vigor:** 18/03/2026 | **Páginas:** 1 de 1 |

---

### 🕒 1. Historial de Revisiones
| Versión | Fecha | Descripción del Cambio | Autor |
|---------|-------|------------------------|-------|
| 1.0 | 15/03/2026 | Creación inicial del sistema de 4 niveles. | Neuro-IA Team |
| 2.0 | 17/03/2026 | Ampliación a 6 niveles (Floración y Cosecha) y sufijos acumulativos. | Neuro-IA Team |
| 2.1 | 18/03/2026 | Formalización de estructura SOP industrial (GACP). | Neuro-IA Team |
| 3.0 | 18/03/2026 | Reestructuración de nomenclatura ID, actualización de base de datos a `trazabilidad_nueva` y motor de rastreo de linaje automatizado. | Neuro-IA Team |

---

### 👪 2. Lista de Distribución
*   **Copia Digital 01**: Dirección de Cultivo (Servidor Central).
*   **Copia Digital 02**: Responsable de Calidad (QA).
*   **Copia Digital 03**: Acceso Terminales de Sala (App Móvil/Web).

---

### 🎯 3. Objetivo y Propósito
Garantizar la identificación inequívoca de cada lote de plantas en todas sus fases biológicas, permitiendo una reconstrucción retrospectiva completa (desde el producto final cosechado hasta su genética original) para cumplir con los estándares de calidad GACP y requisitos legales de trazabilidad. El sistema garantiza el bloqueo automático de saltos de fase (ej. no se puede pasar a floración sin pasar por vegetativo).

---

### 🛠️ 4. Equipo y Suministros
*   **Hardware**: Impresora térmica de etiquetas, Terminales de Administración (Web).
*   **Software**: Google Sheets (Base de Datos Operativa `trazabilidad_nueva`), Panel de Administración Neuro-IA (App Web), Motor de Trazabilidad Retrospectiva.
*   **Materiales**: Etiquetas sintéticas resistentes a humedad y luz UV, Sustrato de impresión.

---

### ⚙️ 5. Procedimiento Operativo

#### 5.1 Jerarquía y Codificación Profesional (Autogenerada)
Cada código QR y etiqueta debe ser único e intransferible. El sistema (App Web) utiliza una **nomenclatura acumulativa y estricta** por fase biológica que permite deducir el linaje completo leyendo el ID de atrás hacia adelante:

1.  **Madres (`PM`)**: `[VARIEDAD]-PM-[NUM]-[AÑO]`
    *   *Ejemplo:* `CBG-PM-1-26` (Genética CBG, Planta Madre nº 1, Año 2026).
2.  **Clones (`CL`)**: Toma la ID exacta de la madre y añade un sufijo correlativo del lote de esquejes.
    *   *Ejemplo:* `CBG-PM-1-26-CL-1` (Lote de clones nº 1 proveniente de la madre CBG nº 1).
3.  **Lote Vegetativo (`V`)**: Toma la ID del lote de clones que ha enraizado y le añade el sufijo **V**.
    *   *Ejemplo:* `CBG-PM-1-26-CL-1-V`
4.  **Floración (`F`)**: Toma la ID del lote vegetativo y le añade el sufijo **F**.
    *   *Ejemplo:* `CBG-PM-1-26-CL-1-VF`
5.  **Cosecha (`C`)**: Toma la ID del lote en floración que ha sido cortado y le añade el sufijo **C**.
    *   *Ejemplo:* `CBG-PM-1-26-CL-1-VFC`

#### 5.2 Registro de Datos y Operativa en Panel
*   **Restricción de Origen:** El alta de una nueva fase está estrictamente vinculada a la existencia de la fase anterior (ej. el sistema solo permite crear un lote vegetativo seleccionando un lote de clones válido del desplegable).
*   **Automatización de Etiquetas:** Tras el alta de cualquier fase, el operario debe acceder a la pestaña **"Etiquetado"** e imprimir térmicamente la nueva etiqueta QR para colocarla inmediatamente en la bandeja o maceta correspondiente.
*   **Peso de Cosecha:** Es obligatorio registrar el **Peso Húmedo (g)** inmediatamente tras el corte en la pestaña de Alta "COSECHA".

#### 5.3 Verificación Retrospectiva
En caso de auditoría o revisión de calidad, el responsable (QA) utilizará el módulo **"Visor QR"** para escanear cualquier lote. El sistema Neuro-IA mostrará la ficha del lote y desplegará automáticamente el **Árbol de Trazabilidad Completa (Linaje)** hasta llegar a la genética base.

---

### ⚖️ 6. Responsabilidades
| Cargo | Responsabilidad |
|-------|----------------|
| **Operario de Sala** | Ejecutar altas en el Panel y colocar las etiquetas físicas generadas en tiempo real. |
| **Responsable de Calidad (QA)** | Verificar la trazabilidad mediante el Visor QR y auditar la exactitud de los pesos húmedos. |
| **Director de Cultivo** | Supervisar la Base de Datos (`trazabilidad_nueva`) y aprobar la destrucción de lotes o inserción de nuevas genéticas maestras. |

---

### 📚 7. Referencias
*   **GACP**: Good Agricultural and Collection Practices for Starting Materials of Herbal Origin (EMA).
*   **Regulación Local**: Normativa vigente para el cultivo de cannabis industrial/médico.

---
**Neuro-IA | Excelencia en Trazabilidad Digital**  
*Documento mantenido y ejecutado automáticamente por el Sistema Neuro-IA*
