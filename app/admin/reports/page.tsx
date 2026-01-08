"use client";

import { useState } from "react";
import {
  CustomCard,
  CustomButton,
  CustomBadge,
} from "@/src/components/project/CustomCard";
import {
  TrendingUp,
  Download,
  AlertTriangle,
  DollarSign,
  Package,
  Clock,
} from "lucide-react";

export default function ReportsPage() {
  const [selectedTab, setSelectedTab] = useState("control-presupuesto");

  // Mock data para demostración
  const projectData = {
    name: "Remodelación Oficinas Tech Solutions",
    client: "Tech Solutions S.A.",
    progressPercentage: 75,
    totalBudget: 45000,
    executedBudget: 33750,
    margin: 18,
  };

  const budgetCategories = [
    {
      name: "Demolición y Preparación",
      budgeted: 5000,
      consumed: 5000,
      percentage: 100,
      status: "critical",
    },
    {
      name: "Divisiones y Drywall",
      budgeted: 8000,
      consumed: 8000,
      percentage: 100,
      status: "critical",
    },
    {
      name: "Sistema Eléctrico",
      budgeted: 10000,
      consumed: 10000,
      percentage: 100,
      status: "critical",
    },
    {
      name: "Aire Acondicionado",
      budgeted: 12000,
      consumed: 8750,
      percentage: 73,
      status: "normal",
    },
    {
      name: "Pintura y Acabados",
      budgeted: 6000,
      consumed: 2000,
      percentage: 33,
      status: "normal",
    },
    {
      name: "Mobiliario",
      budgeted: 4000,
      consumed: 0,
      percentage: 0,
      status: "normal",
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("es-DO", {
      style: "currency",
      currency: "DOP",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "critical":
        return "Crítico";
      case "warning":
        return "Alerta";
      default:
        return "Normal";
    }
  };

  return (
    <div className="min-h-screen bg-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Reporte del Proyecto
          </h1>
          <p className="text-gray-500 mt-1">
            Análisis detallado: {projectData.name}
          </p>
        </div>
        <CustomButton className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
          <Download className="w-4 h-4 mr-2" />
          Exportar PDF
        </CustomButton>
      </div>

      {/* Project Selector */}
      <CustomCard className="p-6">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Proyecto a Analizar:
          </label>
          <select className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option>
              {projectData.name} - {projectData.client}
            </option>
          </select>
        </div>
      </CustomCard>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <CustomCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Progreso General</p>
              <p className="text-2xl font-bold text-gray-900">
                {projectData.progressPercentage}%
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </CustomCard>

        <CustomCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Presupuesto Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(projectData.totalBudget)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </CustomCard>

        <CustomCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ejecutado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(projectData.executedBudget)}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </CustomCard>

        <CustomCard className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Margen</p>
              <p className="text-2xl font-bold text-gray-900">
                {projectData.margin}%
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </CustomCard>
      </div>

      {/* Tabs */}
      <div className="space-y-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              "control-presupuesto",
              "analisis-financiero",
              "progreso-fisico",
              "cronograma",
              "recursos",
            ].map((tab) => {
              const labels = {
                "control-presupuesto": "Control Presupuesto",
                "analisis-financiero": "Análisis Financiero",
                "progreso-fisico": "Progreso Físico",
                cronograma: "Cronograma",
                recursos: "Recursos",
              };
              return (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {labels[tab as keyof typeof labels]}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Control Presupuesto Tab */}
        {selectedTab === "control-presupuesto" && (
          <div className="space-y-6">
            {/* Budget Alerts */}
            <div className="space-y-3">
              {budgetCategories
                .filter((cat) => cat.status === "critical")
                .map((category, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800">
                        <strong>{category.name}</strong>: {category.percentage}%
                        del presupuesto consumido - ¡Límite excedido!
                      </p>
                    </div>
                  </div>
                ))}
            </div>

            {/* Consumption and Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consumo por Categorías */}
              <CustomCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Consumo por Categorías
                </h3>
                <div className="space-y-4">
                  {budgetCategories.map((category, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {category.name}
                          </span>
                          <span className="text-sm text-gray-500">
                            {category.percentage}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-8">
                          <div
                            className={`h-8 rounded-full flex items-center justify-end pr-2 ${
                              category.percentage >= 100
                                ? "bg-red-500"
                                : category.percentage >= 75
                                  ? "bg-yellow-500"
                                  : "bg-blue-500"
                            }`}
                            style={{
                              width: `${Math.min(category.percentage, 100)}%`,
                            }}
                          >
                            <span className="text-xs font-bold text-white">
                              {category.percentage}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CustomCard>

              {/* Estado de Categorías */}
              <CustomCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">
                  Estado de Categorías
                </h3>
                <div className="space-y-4">
                  {budgetCategories.map((category, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle
                          className={`w-4 h-4 ${
                            category.status === "critical"
                              ? "text-red-600"
                              : category.status === "warning"
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {category.name}
                        </span>
                        <CustomBadge
                          className={getStatusColor(category.status)}
                        >
                          {getStatusLabel(category.status)}
                        </CustomBadge>
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {category.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </CustomCard>
            </div>

            {/* Detalle Financiero por Categoría */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Detalle Financiero por Categoría
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgetCategories.map((category, index) => (
                  <CustomCard key={index} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">
                        {category.name}
                      </h4>
                      <CustomBadge
                        className={`${
                          category.percentage >= 100
                            ? "bg-red-600 text-white"
                            : category.percentage >= 75
                              ? "bg-yellow-600 text-white"
                              : "bg-blue-600 text-white"
                        }`}
                      >
                        {category.percentage}%
                      </CustomBadge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Presupuestado:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(category.budgeted)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Consumido:</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(category.consumed)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Restante:</span>
                        <span
                          className={`font-medium ${
                            category.percentage > 100
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {formatCurrency(
                            category.budgeted - category.consumed,
                          )}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                        <div
                          className={`h-2 rounded-full ${
                            category.percentage >= 100
                              ? "bg-red-600"
                              : category.percentage >= 75
                                ? "bg-yellow-600"
                                : "bg-blue-600"
                          }`}
                          style={{
                            width: `${Math.min(category.percentage, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CustomCard>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Otros tabs (placeholder) */}
        {selectedTab !== "control-presupuesto" && (
          <CustomCard className="p-12 text-center">
            <p className="text-gray-500">
              Contenido de {selectedTab} en desarrollo
            </p>
          </CustomCard>
        )}
      </div>
    </div>
  );
}
