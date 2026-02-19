import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

interface CategoryData {
    Category: string;
    Sales: number;
}

interface SeasonData {
    Season: string;
    Sales: number;
}

interface ModelMetric {
    model?: string;
    ''?: string;
    'Unnamed: 0'?: string;
    'R2 Train': number;
    'R2 Test': number;
    'MAE': number;
    'MAPE'?: number;
    'RMSE': number;
}

export const CategoryBarChart = ({ data }: { data: CategoryData[] }) => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis
                        dataKey="Category"
                        angle={-45}
                        textAnchor="end"
                        interval={0}
                        height={60}
                        fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number | undefined) => [value?.toLocaleString() ?? '0', 'Sales']}
                    />
                    <Bar dataKey="Sales" fill="#8884d8" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export const SeasonPieChart = ({ data }: { data: SeasonData[] }) => {
    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="Sales"
                        nameKey="Season"
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number | undefined) => [value?.toLocaleString() ?? '0', 'Sales']}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

export const ModelMetricsChart = ({ metrics }: { metrics: ModelMetric[] }) => {
    const data = metrics.map(m => ({
        name: m.model ?? m[''] ?? m['Unnamed: 0'] ?? 'Unknown',
        train: m['R2 Train'],
        test: m['R2 Test']
    }));

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis domain={[0, 1]} fontSize={12} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="train" name="R2 Train" fill="#0088FE" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="test" name="R2 Test" fill="#00C49F" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
