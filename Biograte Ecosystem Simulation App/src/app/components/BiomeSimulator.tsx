import { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Info } from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';

// Types pour la simulation
type BiomeType = 'desert' | 'savanna' | 'grassland' | 'forest' | 'rainforest' | 'tundra' | 'empty';

interface Cell {
  biome: BiomeType;
  temperature: number;
  humidity: number;
  altitude: number;
  vegetation: number; // 0-100
  species: string[];
}

// Définition des biomes avec leurs couleurs et conditions
const BIOMES = {
  empty: { color: '#f5f5f5', name: 'Vide', temp: [0, 100], hum: [0, 100], aggression: 0 },
  tundra: { color: '#c7e9f0', name: 'Toundra', temp: [-10, 10], hum: [10, 40], aggression: 0.6 },
  desert: { color: '#f4e4c1', name: 'Désert', temp: [25, 50], hum: [0, 20], aggression: 0.9 },
  savanna: { color: '#e8d4a0', name: 'Savane', temp: [20, 35], hum: [20, 50], aggression: 0.8 },
  grassland: { color: '#c8e6a0', name: 'Prairie', temp: [10, 25], hum: [30, 60], aggression: 0.7 },
  forest: { color: '#7fb069', name: 'Forêt', temp: [5, 20], hum: [50, 80], aggression: 0.5 },
  rainforest: { color: '#2d6a4f', name: 'Forêt tropicale', temp: [20, 30], hum: [70, 100], aggression: 0.6 },
};

// Espèces végétales avec leurs niches écologiques
const SPECIES = {
  cactus: { name: 'Cactus', biomes: ['desert'], growth: 0.8, competitiveness: 0.9 },
  lichen: { name: 'Lichen', biomes: ['tundra'], growth: 0.5, competitiveness: 0.4 },
  grass: { name: 'Herbe', biomes: ['grassland', 'savanna'], growth: 1.2, competitiveness: 0.8 },
  shrub: { name: 'Arbuste', biomes: ['savanna', 'grassland'], growth: 0.9, competitiveness: 0.7 },
  oak: { name: 'Chêne', biomes: ['forest'], growth: 0.5, competitiveness: 0.5 },
  pine: { name: 'Pin', biomes: ['forest', 'tundra'], growth: 0.6, competitiveness: 0.6 },
  palm: { name: 'Palmier', biomes: ['rainforest'], growth: 0.9, competitiveness: 0.7 },
  liana: { name: 'Liane', biomes: ['rainforest', 'forest'], growth: 0.8, competitiveness: 0.6 },
};

const GRID_SIZE = 60;
const CELL_SIZE = 10;

export function BiomeSimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [selectedBiome, setSelectedBiome] = useState<BiomeType>('forest');
  const [isDrawing, setIsDrawing] = useState(false);
  const [generation, setGeneration] = useState(0);
  
  // Paramètres environnementaux globaux
  const [globalTemp, setGlobalTemp] = useState([15]);
  const [globalHumidity, setGlobalHumidity] = useState([50]);
  const [globalAltitude, setGlobalAltitude] = useState([50]);

  // Initialiser la grille
  useEffect(() => {
    const newGrid: Cell[][] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      newGrid[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        newGrid[i][j] = {
          biome: 'empty',
          temperature: globalTemp[0],
          humidity: globalHumidity[0],
          altitude: globalAltitude[0],
          vegetation: 0,
          species: [],
        };
      }
    }
    setGrid(newGrid);
  }, []);

  // Dessiner la grille sur le canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dessiner chaque cellule
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const cell = grid[i][j];
        const baseColor = BIOMES[cell.biome].color;
        
        // Moduler la couleur selon la végétation
        const vegetation = cell.vegetation / 100;
        ctx.fillStyle = baseColor;
        
        // Si végétation > 0, assombrir la couleur
        if (vegetation > 0) {
          const rgb = hexToRgb(baseColor);
          if (rgb) {
            const darkness = 1 - (vegetation * 0.4);
            ctx.fillStyle = `rgb(${Math.floor(rgb.r * darkness)}, ${Math.floor(rgb.g * darkness)}, ${Math.floor(rgb.b * darkness)})`;
          }
        }
        
        ctx.fillRect(j * CELL_SIZE, i * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        
        // Grille
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(j * CELL_SIZE, i * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }
    }
  }, [grid]);

  // Fonction utilitaire pour convertir hex en RGB
  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Logique de simulation
  const simulateStep = () => {
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) => row.map((cell) => ({ ...cell })));

      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          const cell = newGrid[i][j];
          const neighbors = getNeighbors(prevGrid, i, j);
          
          // 1. Diffusion environnementale (température, humidité)
          const avgTemp = neighbors.reduce((sum, n) => sum + n.temperature, cell.temperature) / (neighbors.length + 1);
          const avgHum = neighbors.reduce((sum, n) => sum + n.humidity, cell.humidity) / (neighbors.length + 1);
          
          cell.temperature = avgTemp * 0.6 + cell.temperature * 0.4;
          cell.humidity = avgHum * 0.6 + cell.humidity * 0.4;

          // 2. Si la cellule est vide, elle peut être colonisée par les voisins
          if (cell.biome === 'empty') {
            const activateNeighbors = neighbors.filter(n => n.biome !== 'empty' && n.vegetation > 30);
            
            if (activateNeighbors.length > 0) {
              // Choisir un biome voisin dominant
              const biomeCounts: Record<string, number> = {};
              activateNeighbors.forEach(n => {
                biomeCounts[n.biome] = (biomeCounts[n.biome] || 0) + 1;
              });
              
              // Probabilité de colonisation basée sur le nombre de voisins
              const colonizationChance = activateNeighbors.length / 8;
              
              if (Math.random() < colonizationChance * 0.3) {
                // Choisir le biome le plus présent
                const dominantBiome = Object.entries(biomeCounts)
                  .sort((a, b) => b[1] - a[1])[0][0] as BiomeType;
                
                cell.biome = dominantBiome;
                cell.vegetation = 10; // Début de colonisation
              }
            }
            continue;
          }

          // 3. Adaptation du biome selon les conditions environnementales
          const currentBiomeScore = isBiomeOptimal(cell);
          const bestAlternative = findBestBiomeForConditions(cell.temperature, cell.humidity, cell.altitude);
          const currentAggression = BIOMES[cell.biome].aggression;
          
          // Remplacement TRÈS agressif si un autre biome est plus adapté
          if (bestAlternative.biome !== cell.biome) {
            const scoreDifference = bestAlternative.score - currentBiomeScore;
            
            // Plus la différence est grande, plus la probabilité de remplacement est élevée
            const replacementChance = Math.max(0, scoreDifference * 0.8);
            
            if (Math.random() < replacementChance) {
              cell.biome = bestAlternative.biome;
              cell.vegetation = Math.max(10, cell.vegetation * 0.5);
              cell.species = [];
            }
          }
          
          // Mort rapide si conditions très défavorables
          if (currentBiomeScore < 0.3) {
            const deathChance = (1 - currentBiomeScore) * 0.3;
            if (Math.random() < deathChance) {
              cell.biome = 'empty';
              cell.vegetation = 0;
              cell.species = [];
              continue;
            }
          }

          // 4. Croissance de la végétation
          if (currentBiomeScore > 0.3) {
            const growthRate = 2.0 * currentBiomeScore;
            cell.vegetation = Math.min(100, cell.vegetation + growthRate);
            
            // Introduire des espèces
            Object.entries(SPECIES).forEach(([key, species]) => {
              if (species.biomes.includes(cell.biome) && !cell.species.includes(key)) {
                if (Math.random() < species.growth * 0.12 * currentBiomeScore) {
                  cell.species.push(key);
                }
              }
            });
          } else {
            // Déclin RAPIDE si conditions défavorables
            const declineRate = 4 * (1 - currentBiomeScore);
            cell.vegetation = Math.max(0, cell.vegetation - declineRate);
            
            // Perte d'espèces
            if (Math.random() < 0.35) {
              cell.species = cell.species.filter(() => Math.random() > 0.5);
            }
            
            // Si la végétation est faible, le biome meurt
            if (cell.vegetation < 10 && Math.random() < 0.25) {
              cell.biome = 'empty';
              cell.species = [];
              cell.vegetation = 0;
              continue;
            }
          }

          // 5. Dispersion des espèces vers les voisins
          if (cell.species.length > 0 && cell.vegetation > 30) {
            const emptyOrCompatibleNeighbors = neighbors.filter(n => {
              const nCell = newGrid[n.i][n.j];
              return nCell.biome !== 'empty' && nCell.vegetation < 80;
            });
            
            if (emptyOrCompatibleNeighbors.length > 0 && Math.random() < 0.2) {
              const neighbor = emptyOrCompatibleNeighbors[Math.floor(Math.random() * emptyOrCompatibleNeighbors.length)];
              const speciesIndex = Math.floor(Math.random() * cell.species.length);
              const species = cell.species[speciesIndex];
              const neighborCell = newGrid[neighbor.i][neighbor.j];
              
              if (SPECIES[species as keyof typeof SPECIES].biomes.includes(neighborCell.biome)) {
                if (!neighborCell.species.includes(species)) {
                  neighborCell.species.push(species);
                  neighborCell.vegetation = Math.min(100, neighborCell.vegetation + 8);
                }
              }
            }
          }

          // 6. Compétition FÉROCE et invasion entre biomes adjacents
          const activeNeighbors = neighbors.filter(n => n.biome !== 'empty');
          
          // Pour chaque type de biome voisin différent, calculer sa force d'invasion
          const invasionThreats: Array<{ biome: BiomeType, strength: number, count: number, aggression: number }> = [];
          
          activeNeighbors.forEach(neighbor => {
            if (neighbor.biome !== cell.biome) {
              const neighborScore = isBiomeOptimalForConditions(
                neighbor.biome,
                cell.temperature,
                cell.humidity,
                cell.altitude
              );
              
              const neighborAggression = BIOMES[neighbor.biome].aggression;
              
              // Force d'invasion = adaptation + végétation + agressivité du biome
              const invasionStrength = (neighborScore * 0.6) + (neighbor.vegetation / 150) + (neighborAggression * 0.3);
              
              const existing = invasionThreats.find(t => t.biome === neighbor.biome);
              if (existing) {
                existing.count++;
                existing.strength = Math.max(existing.strength, invasionStrength);
              } else {
                invasionThreats.push({
                  biome: neighbor.biome,
                  strength: invasionStrength,
                  count: 1,
                  aggression: neighborAggression
                });
              }
            }
          });
          
          // Trier par force d'invasion totale
          invasionThreats.sort((a, b) => (b.strength * b.count * (1 + b.aggression)) - (a.strength * a.count * (1 + a.aggression)));
          
          // Invasions multiples possibles
          invasionThreats.forEach((threat, index) => {
            if (index > 2) return; // Maximum 3 menaces considérées
            
            const currentStrength = currentBiomeScore * (cell.vegetation / 100) * (1 + currentAggression);
            const threatPower = threat.strength * threat.count * (1 + threat.aggression);
            
            // Probabilité d'invasion basée sur le rapport de force
            const invasionChance = Math.max(0, (threatPower - currentStrength) * 0.35);
            
            if (Math.random() < invasionChance) {
              cell.biome = threat.biome;
              cell.vegetation = Math.min(35, threat.count * 8); // Plus de voisins = plus de végétation initiale
              cell.species = [];
            }
          });
        }
      }

      return newGrid;
    });
    
    setGeneration((g) => g + 1);
  };

  // Obtenir les voisins d'une cellule
  function getNeighbors(grid: Cell[][], i: number, j: number) {
    const neighbors: Array<Cell & { i: number; j: number }> = [];
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        if (di === 0 && dj === 0) continue;
        const ni = i + di;
        const nj = j + dj;
        if (ni >= 0 && ni < GRID_SIZE && nj >= 0 && nj < GRID_SIZE) {
          neighbors.push({ ...grid[ni][nj], i: ni, j: nj });
        }
      }
    }
    return neighbors;
  }

  // Déterminer le biome optimal selon les conditions
  function determineBiome(temp: number, hum: number, alt: number): BiomeType {
    // Altitude influence la température
    const adjustedTemp = temp - (alt / 10);

    if (adjustedTemp < 10 && hum < 40) return 'tundra';
    if (adjustedTemp > 25 && hum < 20) return 'desert';
    if (adjustedTemp > 20 && hum < 50) return 'savanna';
    if (adjustedTemp > 10 && adjustedTemp < 25 && hum > 30 && hum < 60) return 'grassland';
    if (adjustedTemp < 20 && hum > 50) return 'forest';
    if (adjustedTemp > 20 && hum > 70) return 'rainforest';
    
    return 'grassland';
  }

  // Vérifier si les conditions sont optimales pour le biome
  function isBiomeOptimal(cell: Cell): number {
    const biome = BIOMES[cell.biome];
    const adjustedTemp = cell.temperature - (cell.altitude / 10);
    
    // Calculer la distance par rapport à la plage optimale
    const tempCenter = (biome.temp[0] + biome.temp[1]) / 2;
    const humCenter = (biome.hum[0] + biome.hum[1]) / 2;
    
    const tempDist = Math.abs(adjustedTemp - tempCenter) / ((biome.temp[1] - biome.temp[0]) / 2);
    const humDist = Math.abs(cell.humidity - humCenter) / ((biome.hum[1] - biome.hum[0]) / 2);
    
    // Score basé sur la proximité au centre optimal (0 = parfait, >1 = hors zone)
    const score = Math.max(0, 1 - (tempDist + humDist) / 2);
    
    return Math.max(0, Math.min(1, score));
  }

  // Vérifier si un biome est optimal pour des conditions spécifiques
  function isBiomeOptimalForConditions(biome: BiomeType, temp: number, hum: number, alt: number): number {
    const adjustedTemp = temp - (alt / 10);
    const biomeData = BIOMES[biome];
    
    const tempCenter = (biomeData.temp[0] + biomeData.temp[1]) / 2;
    const humCenter = (biomeData.hum[0] + biomeData.hum[1]) / 2;
    
    const tempDist = Math.abs(adjustedTemp - tempCenter) / ((biomeData.temp[1] - biomeData.temp[0]) / 2);
    const humDist = Math.abs(hum - humCenter) / ((biomeData.hum[1] - biomeData.hum[0]) / 2);
    
    const score = Math.max(0, 1 - (tempDist + humDist) / 2);
    
    return Math.max(0, Math.min(1, score));
  }

  // Trouver le biome le plus adapté aux conditions actuelles
  function findBestBiomeForConditions(temp: number, hum: number, alt: number): { biome: BiomeType, score: number } {
    let bestBiome: BiomeType = 'grassland';
    let bestScore = 0;
    
    const biomeTypes: BiomeType[] = ['tundra', 'desert', 'savanna', 'grassland', 'forest', 'rainforest'];
    
    biomeTypes.forEach(biomeType => {
      const score = isBiomeOptimalForConditions(biomeType, temp, hum, alt);
      if (score > bestScore) {
        bestScore = score;
        bestBiome = biomeType;
      }
    });
    
    return { biome: bestBiome, score: bestScore };
  }

  // Boucle de simulation
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      simulateStep();
    }, 200);

    return () => clearInterval(interval);
  }, [isRunning, grid]);

  // Gestion du dessin à la souris
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

    if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map((row) => row.map((cell) => ({ ...cell })));
        newGrid[y][x].biome = selectedBiome;
        newGrid[y][x].temperature = globalTemp[0];
        newGrid[y][x].humidity = globalHumidity[0];
        newGrid[y][x].altitude = globalAltitude[0];
        newGrid[y][x].vegetation = 50; // Commencer avec de la végétation
        return newGrid;
      });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    handleCanvasClick(e);
  };

  const handleReset = () => {
    setIsRunning(false);
    setGeneration(0);
    const newGrid: Cell[][] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      newGrid[i] = [];
      for (let j = 0; j < GRID_SIZE; j++) {
        newGrid[i][j] = {
          biome: 'empty',
          temperature: globalTemp[0],
          humidity: globalHumidity[0],
          altitude: globalAltitude[0],
          vegetation: 0,
          species: [],
        };
      }
    }
    setGrid(newGrid);
  };

  // Calculer les statistiques
  const stats = grid.flat().reduce((acc, cell) => {
    if (cell.biome !== 'empty') {
      acc.totalCells++;
      acc.totalVegetation += cell.vegetation;
      acc.speciesCount += cell.species.length;
    }
    return acc;
  }, { totalCells: 0, totalVegetation: 0, speciesCount: 0 });

  return (
    <div className="flex gap-4 p-4 h-screen">
      {/* Panneau de contrôle */}
      <div className="w-80 space-y-4 overflow-y-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Biograte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Simulez l'évolution de biomes et d'espèces végétales en temps réel.
            </p>
            
            <Separator />
            
            <div className="space-y-2">
              <h3 className="font-semibold">Contrôles</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsRunning(!isRunning)}
                  variant={isRunning ? 'default' : 'outline'}
                  className="flex-1"
                >
                  {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                  {isRunning ? 'Pause' : 'Démarrer'}
                </Button>
                <Button onClick={handleReset} variant="outline">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-sm">
                <Badge variant="secondary">Génération: {generation}</Badge>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-semibold">Statistiques</h3>
              <div className="text-sm space-y-1">
                <div>Cellules actives: {stats.totalCells}</div>
                <div>Végétation moyenne: {stats.totalCells > 0 ? (stats.totalVegetation / stats.totalCells).toFixed(1) : 0}%</div>
                <div>Espèces totales: {stats.speciesCount}</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h3 className="font-semibold">Sélectionner un biome</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(BIOMES).map(([key, biome]) => (
                  key !== 'empty' && (
                    <button
                      key={key}
                      onClick={() => setSelectedBiome(key as BiomeType)}
                      className={`p-2 rounded border-2 transition-all ${
                        selectedBiome === key ? 'border-black scale-105' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: biome.color }}
                    >
                      <div className="text-xs font-medium">{biome.name}</div>
                    </button>
                  )
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="font-semibold">Paramètres environnementaux</h3>
              
              <div className="space-y-2">
                <label className="text-sm flex justify-between">
                  <span>Température</span>
                  <span className="text-muted-foreground">{globalTemp[0]}°C</span>
                </label>
                <Slider
                  value={globalTemp}
                  onValueChange={setGlobalTemp}
                  min={-10}
                  max={50}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm flex justify-between">
                  <span>Humidité</span>
                  <span className="text-muted-foreground">{globalHumidity[0]}%</span>
                </label>
                <Slider
                  value={globalHumidity}
                  onValueChange={setGlobalHumidity}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm flex justify-between">
                  <span>Altitude</span>
                  <span className="text-muted-foreground">{globalAltitude[0]}m</span>
                </label>
                <Slider
                  value={globalAltitude}
                  onValueChange={setGlobalAltitude}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="font-semibold">Légende des biomes</h3>
              <div className="space-y-1 text-xs">
                {Object.entries(BIOMES).map(([key, biome]) => (
                  key !== 'empty' && (
                    <div key={key} className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: biome.color }}
                      />
                      <span>{biome.name}</span>
                      <span className="text-muted-foreground ml-auto text-[10px]">
                        Agressivité: {Math.round(biome.aggression * 100)}%
                      </span>
                    </div>
                  )
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                <p>🏜️ <strong>Désert</strong> (90%) et <strong>Savane</strong> (80%) sont très agressifs</p>
                <p>🌲 <strong>Forêt</strong> (50%) est le moins compétitif</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Canvas de simulation */}
      <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={GRID_SIZE * CELL_SIZE}
            height={GRID_SIZE * CELL_SIZE}
            className="border-2 border-border rounded cursor-crosshair shadow-lg"
            onClick={handleCanvasClick}
            onMouseDown={() => setIsDrawing(true)}
            onMouseUp={() => setIsDrawing(false)}
            onMouseLeave={() => setIsDrawing(false)}
            onMouseMove={handleCanvasMouseMove}
          />
          <div className="absolute top-2 left-2 bg-background/90 px-3 py-1 rounded text-sm">
            Cliquez et glissez pour dessiner
          </div>
        </div>
      </div>
    </div>
  );
}