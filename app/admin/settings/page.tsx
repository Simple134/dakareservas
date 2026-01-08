"use client";

import { useState } from "react";
import { CustomCard, CustomButton } from "@/src/components/project/CustomCard";
import { User, Bell, Palette, Shield, Database } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("perfil");
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    sms: true,
  });

  const tabs = [
    { id: "perfil", label: "Perfil", icon: User },
    { id: "notificaciones", label: "Notificaciones", icon: Bell },
    { id: "apariencia", label: "Apariencia", icon: Palette },
    { id: "seguridad", label: "Seguridad", icon: Shield },
    { id: "sistema", label: "Sistema", icon: Database },
  ];

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 mt-1">
            Personaliza tu experiencia en el sistema
          </p>
        </div>
        <CustomButton className="bg-[#07234B] text-white hover:bg-[#0a2d5c]">
          Guardar Cambios
        </CustomButton>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex w-full justify-between items-center bg-gray-100 rounded-lg px-2 py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                style={{ borderRadius: "10px" }}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 p-2 w-full font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "bg-white text-black"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Perfil Tab */}
        {activeTab === "perfil" && (
          <>
            <CustomCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Información Personal
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    <input
                      type="text"
                      defaultValue="Darlin"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido
                    </label>
                    <input
                      type="text"
                      defaultValue="Cepeda"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    defaultValue="darlin.cepeda@daka.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    defaultValue="(809) 555-0123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cargo
                  </label>
                  <input
                    type="text"
                    defaultValue="Jefe"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                  />
                </div>
              </div>
            </CustomCard>

            <CustomCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Configuración de Cuenta
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    defaultValue="darlin.cepeda"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rol en el Sistema
                  </label>
                  <select
                    defaultValue="admin"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                  >
                    <option value="admin">Administrador</option>
                    <option value="manager">Gerente</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="user">Usuario</option>
                  </select>
                </div>
              </div>
            </CustomCard>
          </>
        )}

        {/* Notificaciones Tab */}
        {activeTab === "notificaciones" && (
          <>
            <CustomCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Preferencias de Notificaciones
              </h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900">
                      Notificaciones por Email
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Recibe actualizaciones importantes por correo electrónico
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.email}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          email: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900">
                      Notificaciones Push
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Recibe notificaciones instantáneas en el navegador
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.push}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          push: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900">
                      Notificaciones SMS
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Recibe alertas importantes por mensaje de texto
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifications.sms}
                      onChange={(e) =>
                        setNotifications((prev) => ({
                          ...prev,
                          sms: e.target.checked,
                        }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </CustomCard>

            <CustomCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Tipos de Notificaciones
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">
                    Actualizaciones de Proyectos
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">
                    Alertas de Presupuesto
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">
                    Recordatorios de Fechas Límite
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">
                    Mantenimiento del Sistema
                  </span>
                </label>
              </div>
            </CustomCard>
          </>
        )}

        {/* Apariencia Tab */}
        {activeTab === "apariencia" && (
          <CustomCard className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Tema y Apariencia
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tema
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent">
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="auto">Automático</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idioma
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent">
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Formato de Fecha
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent">
                  <option value="dd/mm/yyyy">DD/MM/YYYY</option>
                  <option value="mm/dd/yyyy">MM/DD/YYYY</option>
                  <option value="yyyy-mm-dd">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent">
                  <option value="dop">Peso Dominicano (DOP)</option>
                  <option value="usd">Dólar Americano (USD)</option>
                  <option value="eur">Euro (EUR)</option>
                </select>
              </div>
            </div>
          </CustomCard>
        )}

        {/* Seguridad Tab */}
        {activeTab === "seguridad" && (
          <>
            <CustomCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Cambiar Contraseña
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#07234B] focus:border-transparent"
                  />
                </div>

                <CustomButton className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Actualizar Contraseña
                </CustomButton>
              </div>
            </CustomCard>

            <CustomCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Configuración de Seguridad
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900">
                      Autenticación de Dos Factores
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Agrega una capa extra de seguridad a tu cuenta
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900">
                      Cerrar Sesión en Otros Dispositivos
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Cierra todas las sesiones activas en otros dispositivos
                    </p>
                  </div>
                  <CustomButton className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
                    Cerrar Sesiones
                  </CustomButton>
                </div>
              </div>
            </CustomCard>
          </>
        )}

        {/* Sistema Tab */}
        {activeTab === "sistema" && (
          <>
            <CustomCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Información del Sistema
              </h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Versión
                  </label>
                  <p className="font-medium text-gray-900">DAKA ERP v1.0.0</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Última Actualización
                  </label>
                  <p className="font-medium text-gray-900">15 de Enero, 2024</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Base de Datos
                  </label>
                  <p className="font-medium text-gray-900">PostgreSQL 14.2</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">
                    Servidor
                  </label>
                  <p className="font-medium text-gray-900">AWS EC2</p>
                </div>
              </div>
            </CustomCard>

            <CustomCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Mantenimiento
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900">
                      Respaldo Automático
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Programar respaldos automáticos de la base de datos
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="border-t border-gray-200"></div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900">
                      Optimización de Base de Datos
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                      Ejecutar mantenimiento automático de la base de datos
                    </p>
                  </div>
                  <CustomButton className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
                    Optimizar Ahora
                  </CustomButton>
                </div>
              </div>
            </CustomCard>
          </>
        )}
      </div>
    </div>
  );
}
