import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Clock, BookOpen, Star, Calendar, X } from 'lucide-react';
import { featuredExams, examCategories } from '../../data/mockData';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import StarRating from '../../components/ui/StarRating';

export default function MarketplacePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') || '');
  const [activeCategory, setActiveCategory] = useState(params.get('category') || 'All');
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [minRating, setMinRating] = useState(0);
  const [difficulty, setDifficulty] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('popular');

  const categories = ['All', ...examCategories.map(e => e.name)];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'];

  const filtered = featuredExams.filter(e => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.category.toLowerCase().includes(search.toLowerCase())) return false;
    if (activeCategory !== 'All' && e.category !== activeCategory) return false;
    if (e.price < priceRange[0] || e.price > priceRange[1]) return false;
    if (e.rating < minRating) return false;
    if (difficulty !== 'All' && e.difficulty !== difficulty) return false;
    return true;
  });

  const clearFilters = () => {
    setSearch('');
    setActiveCategory('All');
    setPriceRange([0, 10000]);
    setMinRating(0);
    setDifficulty('All');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = search || activeCategory !== 'All' || priceRange[1] < 10000 || minRating > 0 || difficulty !== 'All' || dateFrom || dateTo;

  return (
<div className="space-y-6 pt-24 px-4 max-w-7xl mx-auto"> 
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <h1 className="text-3xl font-bold text-white mb-1">Exam Marketplace</h1>
        <p className="text-gray-400">Find the perfect mock exam for your language goals</p>
      </motion.div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search exams, categories, tutors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm transition-all"
          />
        </div>
        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)}>
          <SlidersHorizontal size={16} /> <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && <span className="w-2 h-2 bg-blue-400 rounded-full" />}
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Filters</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <X size={12} /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Difficulty</label>
              <div className="flex flex-wrap gap-2">
                {difficulties.map(d => (
                  <button key={d} onClick={() => setDifficulty(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${difficulty === d ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Min Rating: {minRating}+</label>
              <input type="range" min={0} max={5} step={0.5} value={minRating} onChange={e => setMinRating(Number(e.target.value))}
                className="w-full accent-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Max Price: LKR {priceRange[1].toLocaleString()}</label>
              <input type="range" min={0} max={10000} step={500} value={priceRange[1]} onChange={e => setPriceRange([0, Number(e.target.value)])}
                className="w-full accent-blue-500" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Date Published</label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 pl-7 text-white text-xs focus:outline-none focus:border-blue-500/50" />
                </div>
                <div className="flex-1 relative">
                  <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 pl-7 text-white text-xs focus:outline-none focus:border-blue-500/50" />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
              activeCategory === cat
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{filtered.length} exams found</p>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-gray-300 text-sm focus:outline-none focus:border-blue-500/50"
        >
          <option value="popular" className="bg-[#0f1629]">Most Popular</option>
          <option value="rating" className="bg-[#0f1629]">Highest Rated</option>
          <option value="price-low" className="bg-[#0f1629]">Price: Low to High</option>
          <option value="price-high" className="bg-[#0f1629]">Price: High to Low</option>
          <option value="newest" className="bg-[#0f1629]">Newest First</option>
        </select>
      </div>

      {/* Exam Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((exam, i) => (
          <motion.div key={exam.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <GlassCard hover className="overflow-hidden" onClick={() => navigate(`/exam/${exam.id}/preview`)}>
              <div className="relative h-36 sm:h-44 overflow-hidden">
                <img src={exam.thumbnail} alt={exam.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge color="blue">{exam.category}</Badge>
                  {exam.tag && <Badge color="amber">{exam.tag}</Badge>}
                </div>
                <div className="absolute bottom-3 left-3">
                  <Badge color={exam.difficulty === 'Advanced' || exam.difficulty === 'Expert' ? 'red' : 'yellow'}>{exam.difficulty}</Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-2 leading-snug line-clamp-2 text-sm sm:text-base">{exam.title}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <img src={exam.tutorAvatar} alt={exam.tutor} className="w-6 h-6 rounded-full object-cover" />
                  <span className="text-xs text-gray-400">{exam.tutor}</span>
                </div>
                <StarRating rating={exam.rating} count={exam.reviews} size={13} />
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-2 mb-4">
                  <span className="flex items-center gap-1"><Clock size={11} />{exam.duration}</span>
                  <span className="flex items-center gap-1"><BookOpen size={11} />{exam.questions} Q</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-lg sm:text-xl font-bold text-white">LKR {exam.price.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 line-through ml-2">LKR {exam.originalPrice.toLocaleString()}</span>
                  </div>
                  <Button variant="primary" size="sm">Buy</Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <BookOpen size={48} className="text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg">No exams found</p>
          <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or search query</p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
        </div>
      )}
    </div>
  );
}
