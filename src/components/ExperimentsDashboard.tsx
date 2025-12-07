'use client';

import { useState, useEffect, useCallback } from 'react';
import DataGrid, { 
  Column, 
  Paging, 
  Selection,
  HeaderFilter,
  Sorting
} from 'devextreme-react/data-grid';
import { Chart, Series, CommonSeriesSettings, Legend, Tooltip, ArgumentAxis, ValueAxis } from 'devextreme-react/chart';
import PieChart, { Series as PieSeries, Label, Connector, Legend as PieLegend, Tooltip as PieTooltip } from 'devextreme-react/pie-chart';
import { Button } from 'devextreme-react/button';
import { TextBox } from 'devextreme-react/text-box';

import type { Experiment, ExperimentResults, VariantMetrics } from '@/types/api';
import { 
  getExperiments, 
  getExperimentResults, 
  setAuthToken, 
  checkHealth 
} from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  draft: '#6e7681',
  running: '#3fb950',
  paused: '#d29922',
  completed: '#58a6ff',
};

const CONFIDENCE_COLORS: Record<string, string> = {
  low: '#f85149',
  medium: '#d29922',
  high: '#3fb950',
  significant: '#a371f7',
};

const CONFIDENCE_RULES = [
  { level: 'Low', minUsers: '< 30', minLift: 'Any', color: '#f85149' },
  { level: 'Medium', minUsers: '100+', minLift: '20%+', color: '#d29922' },
  { level: 'High', minUsers: '500+', minLift: '15%+', color: '#3fb950' },
  { level: 'Significant', minUsers: '1000+', minLift: '10%+', color: '#a371f7' },
];

const CHART_PALETTE = ['#58a6ff', '#3fb950', '#f0883e', '#a371f7', '#f85149', '#8b949e'];

export default function ExperimentsDashboard() {
  const [token, setToken] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [results, setResults] = useState<ExperimentResults | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);

  // Check API health on mount
  useEffect(() => {
    checkHealth()
      .then(() => setApiStatus('online'))
      .catch(() => setApiStatus('offline'));
  }, []);

  const handleLogin = useCallback(async () => {
    if (!token.trim()) {
      setError('Please enter an API token');
      return;
    }
    
    setAuthToken(token);
    setLoading(true);
    setError(null);
    
    try {
      const response = await getExperiments();
      setExperiments(response.experiments || []);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadExperimentResults = useCallback(async (experiment: Experiment) => {
    setSelectedExperiment(experiment);
    setLoading(true);
    setError(null);
    
    try {
      const data = await getExperimentResults(experiment.id, {
        format: 'full',
        include_time_series: true,
        time_series_granularity: 'day',
      });
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExperimentSelect = useCallback((e: { selectedRowsData?: Experiment[] }) => {
    if (e.selectedRowsData && e.selectedRowsData.length > 0) {
      loadExperimentResults(e.selectedRowsData[0]);
    }
  }, [loadExperimentResults]);

  const renderStatusCell = useCallback((cellData: { value: string }) => {
    const status = cellData.value;
    return (
      <span 
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium"
        style={{ 
          background: `${STATUS_COLORS[status]}20`,
          color: STATUS_COLORS[status],
          border: `1px solid ${STATUS_COLORS[status]}40`
        }}
      >
        <span 
          className="w-2 h-2 rounded-full" 
          style={{ background: STATUS_COLORS[status] }}
        />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  }, []);

  // API Status Badge
  const StatusBadge = () => (
    <div className="flex items-center gap-2">
      <span 
        className={`w-2 h-2 rounded-full ${
          apiStatus === 'online' ? 'bg-green-500 animate-pulse' : 
          apiStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
        }`}
      />
      <span className="text-sm text-gray-400">
        API: {apiStatus === 'checking' ? 'Checking...' : apiStatus}
      </span>
    </div>
  );

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Experiment Analytics</h1>
              <p className="text-gray-400">Enter your API token to continue</p>
            </div>
            
            <StatusBadge />
            
            <div className="mt-6 space-y-4">
              <TextBox
                value={token}
                onValueChanged={(e) => setToken(e.value || '')}
                placeholder="Bearer token..."
                mode="password"
                stylingMode="outlined"
                height={48}
              />
              
              <Button
                text={loading ? 'Connecting...' : 'Connect'}
                type="default"
                stylingMode="contained"
                width="100%"
                height={48}
                onClick={handleLogin}
                disabled={loading || apiStatus === 'offline'}
              />
              
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const variantAllocationData = selectedExperiment?.variants.map(v => ({
    variant: v.name,
    allocation: v.traffic_allocation,
  })) || [];

  // Conversion data from variant_metrics - conversion_rate is already a percentage
  const conversionData: Array<{ variant: string; rate: number; assignments: number; events: number }> = 
    results?.variant_metrics?.map((vm: VariantMetrics) => ({
      variant: vm.variant_name,
      rate: vm.conversion_rate, // Already a percentage (0-100)
      assignments: vm.total_assignments,
      events: vm.total_events,
    })) || [];

  // Events by type chart data
  const eventsByTypeData = results?.events_by_type 
    ? Object.entries(results.events_by_type).map(([type, count]) => ({
        type: type.charAt(0).toUpperCase() + type.slice(1),
        count,
      }))
    : [];

  const variantEventsData = (() => {
    if (!results?.variant_metrics) return [];
    
    const eventTypes = new Set<string>();
    results.variant_metrics.forEach(vm => {
      Object.keys(vm.events_by_type).forEach(type => eventTypes.add(type));
    });
    
    return Array.from(eventTypes).map(eventType => {
      const row: Record<string, string | number> = {
        eventType: eventType.charAt(0).toUpperCase() + eventType.slice(1),
      };
      results.variant_metrics.forEach(vm => {
        row[vm.variant_name] = vm.events_by_type[eventType] || 0;
      });
      return row;
    });
  })();

  const timeSeriesData = results?.time_series?.map(ts => ({
    date: new Date(ts.timestamp).toLocaleDateString(),
    variant: ts.variant_name,
    conversions: ts.events,
    rate: ts.conversion_rate,
  })) || [];

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            Experiment Analytics
          </h1>
          <p className="text-gray-400">
            {experiments.length} experiments loaded
          </p>
        </div>
        <StatusBadge />
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Experiments
            </h2>
            
            <DataGrid
              dataSource={experiments}
              keyExpr="id"
              showBorders={false}
              columnAutoWidth={true}
              rowAlternationEnabled={false}
              hoverStateEnabled={true}
              height={500}
              onSelectionChanged={handleExperimentSelect}
            >
              <Selection mode="single" />
              <Sorting mode="single" />
              <HeaderFilter visible={true} />
              <Paging pageSize={10} />
              
              <Column 
                dataField="name" 
                caption="Name"
                cellRender={(data) => (
                  <span className="font-medium text-white">{data.value}</span>
                )}
              />
              <Column 
                dataField="status" 
                caption="Status"
                width={120}
                cellRender={renderStatusCell}
              />
              <Column 
                dataField="variants"
                caption="Variants"
                width={80}
                calculateCellValue={(data: Experiment) => data.variants?.length || 0}
                alignment="center"
              />
            </DataGrid>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          {!selectedExperiment ? (
            <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Select an Experiment
              </h3>
              <p className="text-gray-400">
                Click on an experiment from the list to view its analytics
              </p>
            </div>
          ) : (
            <>
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                      {results?.experiment_name || selectedExperiment.name}
                    </h2>
                    {selectedExperiment.description && (
                      <p className="text-gray-400 mb-4">{selectedExperiment.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      {renderStatusCell({ value: results?.experiment_status || selectedExperiment.status })}
                      {results?.analysis_start && (
                        <span className="text-gray-500">
                          Analysis: {new Date(results.analysis_start).toLocaleDateString()} - {new Date(results.analysis_end).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {results?.summary && (
                    <div className="text-right">
                      <div className="text-sm text-gray-400 mb-1">Confidence</div>
                      <span 
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                        style={{ 
                          background: `${CONFIDENCE_COLORS[results.summary.confidence_level]}20`,
                          color: CONFIDENCE_COLORS[results.summary.confidence_level],
                          border: `1px solid ${CONFIDENCE_COLORS[results.summary.confidence_level]}40`
                        }}
                      >
                        {results.summary.confidence_level.charAt(0).toUpperCase() + results.summary.confidence_level.slice(1)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Raw JSON Viewer */}
              {results && (
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setShowJson(!showJson)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                      <span className="text-lg font-semibold text-white">Raw JSON Response</span>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transition-transform ${showJson ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showJson && (
                    <div className="px-6 pb-6">
                      <pre className="bg-black/30 border border-[var(--card-border)] rounded-xl p-4 overflow-x-auto text-sm text-gray-300 font-mono max-h-96 overflow-y-auto">
                        {JSON.stringify(results, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {results?.summary && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { 
                      label: 'Total Assignments', 
                      value: results.summary.total_assignments.toLocaleString(),
                      icon: '👥',
                      color: 'blue'
                    },
                    { 
                      label: 'Total Events', 
                      value: results.summary.total_events.toLocaleString(),
                      icon: '📊',
                      color: 'purple'
                    },
                    { 
                      label: 'Conversion Rate', 
                      value: `${results.summary.overall_conversion_rate.toFixed(1)}%`,
                      icon: '📈',
                      color: 'green'
                    },
                    { 
                      label: 'Leading Variant', 
                      value: results.summary.leading_variant || 'N/A',
                      icon: '🏆',
                      color: 'yellow'
                    },
                  ].map((stat, i) => (
                    <div 
                      key={i}
                      className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-4"
                    >
                      <div className="text-2xl mb-2">{stat.icon}</div>
                      <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                      <div className="text-sm text-gray-400">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confidence Level Rules */}
              <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Confidence Level Rules
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]">
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Confidence</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Min Users/Variant</th>
                        <th className="text-left py-2 px-3 text-gray-400 font-medium">Min Lift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CONFIDENCE_RULES.map((rule) => (
                        <tr key={rule.level} className="border-b border-[var(--card-border)]/50">
                          <td className="py-2 px-3">
                            <span 
                              className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ 
                                background: `${rule.color}20`,
                                color: rule.color,
                                border: `1px solid ${rule.color}40`
                              }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: rule.color }} />
                              {rule.level}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-gray-300 font-mono">{rule.minUsers}</td>
                          <td className="py-2 px-3 text-gray-300 font-mono">{rule.minLift}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {variantAllocationData.length > 0 && (
                  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Traffic Allocation</h3>
                    <PieChart
                      dataSource={variantAllocationData}
                      palette={CHART_PALETTE}
                      diameter={0.8}
                    >
                      <PieSeries
                        argumentField="variant"
                        valueField="allocation"
                      >
                        <Label visible={true} format="fixedPoint">
                          <Connector visible={true} width={1} />
                        </Label>
                      </PieSeries>
                      <PieLegend 
                        orientation="horizontal" 
                        horizontalAlignment="center"
                        verticalAlignment="bottom"
                        itemTextPosition="right"
                      />
                      <PieTooltip 
                        enabled={true} 
                        customizeTooltip={(arg: { argumentText: string; valueText: string }) => ({
                          text: `${arg.argumentText}: ${arg.valueText}%`
                        })}
                      />
                    </PieChart>
                  </div>
                )}

                {eventsByTypeData.length > 0 && (
                  <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Events by Type</h3>
                    <PieChart
                      dataSource={eventsByTypeData}
                      palette={CHART_PALETTE}
                      diameter={0.8}
                    >
                      <PieSeries
                        argumentField="type"
                        valueField="count"
                      >
                        <Label visible={true} format="fixedPoint">
                          <Connector visible={true} width={1} />
                        </Label>
                      </PieSeries>
                      <PieLegend 
                        orientation="horizontal" 
                        horizontalAlignment="center"
                        verticalAlignment="bottom"
                        itemTextPosition="right"
                      />
                      <PieTooltip 
                        enabled={true} 
                        customizeTooltip={(arg: { argumentText: string; valueText: string }) => ({
                          text: `${arg.argumentText}: ${arg.valueText} events`
                        })}
                      />
                    </PieChart>
                  </div>
                )}
              </div>

              {conversionData.length > 0 && (
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Conversion by Variant</h3>
                  <Chart
                    dataSource={conversionData}
                    palette={CHART_PALETTE}
                  >
                    <CommonSeriesSettings
                      argumentField="variant"
                      type="bar"
                      barPadding={0.3}
                    />
                    <Series valueField="rate" name="Conversion Rate %" />
                    <ArgumentAxis>
                      <Label visible={true} />
                    </ArgumentAxis>
                    <ValueAxis>
                      <Label visible={true} />
                    </ValueAxis>
                    <Legend visible={false} />
                    <Tooltip 
                      enabled={true}
                      customizeTooltip={(arg: { argumentText: string; valueText: string }) => ({
                        text: `${arg.argumentText}: ${arg.valueText}%`
                      })}
                    />
                  </Chart>
                </div>
              )}

              {variantEventsData.length > 0 && results?.variant_metrics && (
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Events Breakdown by Variant</h3>
                  <Chart
                    dataSource={variantEventsData}
                    palette={CHART_PALETTE}
                  >
                    <CommonSeriesSettings
                      argumentField="eventType"
                      type="bar"
                      barPadding={0.2}
                    />
                    {results.variant_metrics.map((vm: VariantMetrics) => (
                      <Series 
                        key={vm.variant_id}
                        valueField={vm.variant_name}
                        name={vm.variant_name}
                      />
                    ))}
                    <ArgumentAxis>
                      <Label visible={true} />
                    </ArgumentAxis>
                    <ValueAxis>
                      <Label visible={true} />
                    </ValueAxis>
                    <Legend 
                      visible={true}
                      horizontalAlignment="center"
                      verticalAlignment="bottom"
                    />
                    <Tooltip enabled={true} />
                  </Chart>
                </div>
              )}

              {timeSeriesData.length > 0 && (
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Conversions Over Time</h3>
                  <Chart
                    dataSource={timeSeriesData}
                    palette={CHART_PALETTE}
                  >
                    <CommonSeriesSettings
                      argumentField="date"
                      type="spline"
                    />
                    <Series valueField="conversions" name="Conversions" />
                    <ArgumentAxis>
                      <Label visible={true} rotationAngle={-45} />
                    </ArgumentAxis>
                    <ValueAxis>
                      <Label visible={true} />
                    </ValueAxis>
                    <Legend 
                      visible={true}
                      horizontalAlignment="center"
                      verticalAlignment="bottom"
                    />
                    <Tooltip enabled={true} />
                  </Chart>
                </div>
              )}

                {results?.variant_metrics && (
                <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Variant Performance</h3>
                  <DataGrid
                    dataSource={results.variant_metrics}
                    keyExpr="variant_id"
                    showBorders={false}
                    columnAutoWidth={true}
                    rowAlternationEnabled={false}
                  >
                    <Column 
                      dataField="variant_name" 
                      caption="Variant"
                      cellRender={(data) => (
                        <span className="font-medium text-white">{data.value}</span>
                      )}
                    />
                    <Column 
                      dataField="total_assignments" 
                      caption="Assignments"
                      format="fixedPoint"
                    />
                    <Column 
                      dataField="total_events" 
                      caption="Events"
                      format="fixedPoint"
                    />
                    <Column 
                      dataField="unique_users_with_events" 
                      caption="Unique Users"
                      format="fixedPoint"
                    />
                    <Column 
                      dataField="events_per_user" 
                      caption="Events/User"
                      cellRender={(data) => (
                        <span className="text-gray-300 font-mono">
                          {Number(data.value).toFixed(1)}
                        </span>
                      )}
                    />
                    <Column 
                      dataField="conversion_rate" 
                      caption="Conv. Rate"
                      cellRender={(data) => (
                        <span className="text-green-400 font-mono">
                          {Number(data.value).toFixed(1)}%
                        </span>
                      )}
                    />
                  </DataGrid>
                </div>
              )}

              {results?.generated_at && (
                <div className="text-center text-sm text-gray-500">
                  Analysis generated at: {new Date(results.generated_at).toLocaleString()}
                </div>
              )}
            </>
          )}

          {loading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-[var(--card-bg)] rounded-2xl p-8 text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
