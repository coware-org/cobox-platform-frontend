# Perfil de usuario con Auth0

La barra superior y `/profile` componen la identidad del usuario autenticado con
su perfil interno de IAM. Google y la conexión de usuario/contraseña utilizan
el mismo flujo; los atributos ausentes tienen un respaldo explícito.

## Fuentes y prioridad

`Auth0ProviderWithNavigate` solicita `openid profile email`. El frontend utiliza
`useAuth0().user`, no el JSON completo del dashboard ni la Management API.

| Información | Fuente |
| --- | --- |
| Nombres y apellidos | CoBox; Auth0 completa los campos vacíos |
| Nombre visible | Nombres/apellidos compuestos; después `name`, `nickname`, correo o `Usuario` |
| Foto | `profilePhotoUrl` de CoBox; después `picture` de Auth0; después iniciales |
| Correo de acceso | Auth0; correo interno si el claim está ausente |
| Verificación del correo | Claim `email_verified` asociado al correo de Auth0; desconocida si falta |
| Roles, ID interno y estado | Perfil de CoBox |
| ID de Auth0 | Claim `sub` |

Los roles se muestran como Cliente, Conductor y Gestor. No se modifican las
reglas de autorización. El indicador de verificación es informativo y no se
persiste ni se usa como autorización.

Las fotos deben tener una URL HTTPS. Si una imagen falla, el avatar muestra
iniciales. Cargar la pantalla no crea perfiles ni sincroniza atributos en IAM.
Las modificaciones de CoBox no cambian la cuenta de Google ni el perfil de Auth0.

## Contrato de IAM

`GET /api/v1/users/me` devuelve:

```ts
{
  id: number;
  auth0Subject: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  roles: string[];
  profilePhotoUrl?: string | null;
  active: boolean;
}
```

El formulario envía a `PUT /api/v1/users/me` correo, nombres, apellidos,
teléfono y la foto disponible. Nombres y apellidos son obligatorios y admiten
60 caracteres; el teléfono admite 20. El teléfono vacío se envía como `null`.
Sin una foto disponible se omite `profilePhotoUrl`, conservando la existente
según el contrato de IAM. Una foto de Google puede persistirse al guardar.
No se envían `name`, `locale`, roles ni un identificador seleccionado por el cliente.

Un GET con 404 representa un perfil todavía inexistente: se permite completar
los datos y crearlo con el PUT existente. Un 401, 403 o fallo de red muestra
error y reintento; no se interpreta como una oportunidad de crear otro perfil.
Si falla una actualización en segundo plano se conserva el formulario montado
y se bloquea el guardado hasta recuperar el perfil. Los borradores sobreviven
a las recargas de datos y a los errores de guardado; tras guardar correctamente
se muestra la respuesta persistida.

## Separación de cuentas

La consulta utiliza `['profile', 'me', sub]`, solo se habilita con una sesión
resuelta y pasa `AbortSignal` al servicio. El perfil recibido debe pertenecer
al mismo `sub`. El guardado actualiza e invalida únicamente la clave de la
cuenta que inició la operación. El cambio de cuenta remonta formulario y avatar.
`Auth0TokenBridge` conserva su limpieza de caché al cambiar la sesión.

## Verificación

Las pruebas usan identidades ficticias y un adaptador HTTP; no contactan al
tenant de Auth0 ni a IAM. Cubren composición, contrato, guardado y relectura,
campos ausentes, errores y representación de cuentas diferentes.

```sh
npm test
npm run build
npx eslint src/app/providers/Auth0ProviderWithNavigate.tsx src/components/layouts/Topbar.tsx src/features/profile tests/profile.test.ts
```

La validación del flujo real requiere iniciar sesión en el entorno conectado:

1. Google: comprobar nombre, foto, correo verificado y formulario precargado.
2. Editar nombres/teléfono, guardar y recargar: deben persistir en CoBox.
3. Usuario/contraseña: completar nombres faltantes y comprobar el respaldo sin foto.
4. Cerrar sesión y entrar con otra cuenta: no deben aparecer datos anteriores.
5. Simular una imagen inaccesible: deben aparecer las iniciales.

## Rama de trabajo

La rama `feature/auth0-user-profile` nace de `develop` local. Este se creó desde
`origin/dev` y se adelantó mediante fast-forward a `main`, que ya contenía los
cambios de evidencias integrados. La revisión debe considerar ese desfase al
integrar hacia la rama de desarrollo remota. No se modificó `main`, el checkout
original ni su `package-lock.json` local. No hay cambios de backend o esquema.
