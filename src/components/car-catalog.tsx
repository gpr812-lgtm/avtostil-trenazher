'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatPriceRange, CarModel } from '@/data/cars';
import { Car } from 'lucide-react';

interface CarCatalogProps {
  selectedCarId?: string;
  onSelectCar?: (car: CarModel) => void;
}

export function CarCatalog({ selectedCarId, onSelectCar }: CarCatalogProps) {
  const [search, setSearch] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('Все');

  const brands = useMemo(() => {
    const uniqueBrands = Array.from(new Set(cars.map((c) => c.brand))).sort();
    return ['Все', ...uniqueBrands];
  }, []);

  const filteredCars = useMemo(() => {
    return cars.filter((car) => {
      const matchesBrand = brandFilter === 'Все' || car.brand === brandFilter;
      const matchesSearch =
        search.trim() === '' ||
        `${car.brand} ${car.model}`.toLowerCase().includes(search.toLowerCase()) ||
        car.bodyType.toLowerCase().includes(search.toLowerCase());
      return matchesBrand && matchesSearch;
    });
  }, [search, brandFilter]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Car className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Каталог автомобилей</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Справочник моделей и цен для продавца
        </p>
        <div className="space-y-2 pt-2">
          <Input
            placeholder="Поиск модели..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm"
          />
          <div className="flex flex-wrap gap-1">
            {brands.map((brand) => (
              <Badge
                key={brand}
                variant={brandFilter === brand ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setBrandFilter(brand)}
              >
                {brand}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[calc(100vh-340px)] min-h-[300px] px-3 pb-3 scrollbar-thin">
          <div className="space-y-2">
            {filteredCars.map((car) => (
              <div
                key={car.id}
                onClick={() => onSelectCar?.(car)}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50 ${
                  selectedCarId === car.id
                    ? 'border-primary bg-accent/50 glow-primary'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <div className="font-semibold text-sm">
                      {car.brand} {car.model}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {car.bodyType} · {car.engine} · {car.power} л.с.
                    </div>
                  </div>
                </div>
                <div className="text-xs font-medium text-primary">
                  {formatPriceRange(car.priceFrom, car.priceTo)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">
                  {car.transmission} · {car.drive} · {car.seats} мест
                </div>
              </div>
            ))}
            {filteredCars.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-8">
                Ничего не найдено
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

import { cars } from '@/data/cars';
