# OceanBase Multi-Database Vector Search System

A multi-database vector search application based on Next.js and Prisma, supporting intelligent search and recommendation for movie data.

## 🚀 Features

- **Multi-Database Support**: Supports connecting multiple OceanBase databases for federated search
- **Vector Search**: Semantic similarity search based on DashScope Embeddings
- **Hybrid Search**: Intelligent hybrid query combining vector search and keyword search
- **Full-Text Search**: High-performance text search based on database full-text indexes
- **Text Tokenization**: Supports text tokenization and processing
- **Dynamic Routing**: Supports dynamic routing for movie detail pages
- **Modern UI**: Responsive interface design based on Ant Design
- **Real-Time Search**: Supports real-time search and result display

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, Ant Design, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: OceanBase (MySQL compatible)
- **Vector Search**: DashScope Embeddings API

## 📋 Requirements

- Node.js 18+
- npm/yarn/pnpm
- OceanBase database access
- OceanBase database (version 4.1 or above with hybrid search support)

## 🔧 Installation and Configuration

### 1. Clone the Project

```bash
git clone <repository-url>
cd oceanbase-search
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file and configure the following environment variables:

```env
# Database Connection
DATABASE_URL_BACK="mysql://username:password@host:port/database"

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"
EMBEDDING_PROVIDER="openai"
EMBEDDING_MODEL="text-embedding-v4"
DIMENSIONS="1024"
BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"

# Application Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Database Setup

```bash
# Generate Prisma Client
npm run setup

# Run database migrations (if needed)
npm run db:migrate
```

## 🚀 Starting the Project

### Development Environment

```bash
# Start development server (automatically generates Prisma)
npm run dev

# Or start server only (without regenerating Prisma)
npm run dev:only
```

### Production Environment

```bash
# Build the project
npm run build

# Start production server
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

## 📁 Project Structure

```
oceanbase-search/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── full-text-search/     # Full-text search API
│   │   ├── multi-hybrid-search/  # Multi-database hybrid search API
│   │   ├── tokenize/             # Text tokenization API
│   │   └── vector-search/        # Vector search API
│   ├── component/                # Components Directory
│   │   ├── MovieCard/            # Movie card component
│   │   ├── OptimizedMovieImage/  # Optimized image component
│   │   └── SettingModal/        # Settings modal component
│   ├── hybrid-search/            # Hybrid search pages
│   │   ├── [id]/                 # Movie detail page (dynamic route)
│   │   │   ├── page.tsx          # Detail page entry
│   │   │   └── ui/                # Detail page UI components
│   │   ├── page.tsx              # Search page entry
│   │   └── ui/                   # Search page UI components
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Home page
├── lib/                          # Utility Library
│   ├── hooks/                    # React Hooks
│   │   ├── useMovieSearch.ts     # Movie search Hook
│   │   └── useSyncURLState.ts    # URL state sync Hook
│   ├── multi-prisma.ts          # Multi-database management
│   ├── prisma.ts                # Prisma client
│   ├── movies.ts                # Movie data processing
│   └── utils/                    # Utility functions
│       └── searchParams.ts       # Search parameter processing
├── middleware/                   # Middleware
│   ├── model.js                  # Model initialization
│   └── models/                   # Model definitions
│       ├── index.js              # Model exports
│       └── openai.js             # OpenAI model configuration
├── prisma/                       # Database Configuration
│   └── schema.prisma            # Database schema
├── constants/                    # Constants
│   └── index.ts                 # Constant exports
├── public/                       # Static Assets
└── README.md                    # Project Documentation
```

## 🔍 API Endpoints

### Multi-Database Hybrid Search

Multi-database hybrid search endpoint supporting hybrid queries combining vector search and keyword search.

```http
POST /api/multi-hybrid-search
Content-Type: application/json

{
  "query": "search keywords",
  "limit": 10,
  "hybridRadio": 0.7,
  "tableName": "movies_with_rating"
}
```

**Parameters**:

- `query` (required): Search keywords
- `limit` (optional): Number of results to return, default 10, maximum 20
- `hybridRadio` (optional): Hybrid search weight ratio, default 0.7 (vector search weight)
- `tableName` (optional): Database table name, default "movies_with_rating"

### Vector Search

Pure vector search endpoint based on semantic similarity.

```http
POST /api/vector-search
Content-Type: application/json

{
  "query": "search keywords",
  "limit": 10,
  "tableName": "movies_with_rating"
}
```

**Parameters**:

- `query` (required): Search keywords
- `limit` (optional): Number of results to return, default 10, maximum 20
- `tableName` (optional): Database table name, default "movies_with_rating"

### Full-Text Search

Text search endpoint based on database full-text indexes.

```http
POST /api/full-text-search
Content-Type: application/json

{
  "query": "search keywords",
  "limit": 10,
  "tableName": "movies_with_rating"
}
```

**Parameters**:

- `query` (required): Search keywords
- `limit` (optional): Number of results to return, default 10, maximum 20
- `tableName` (optional): Database table name, default "movies_with_rating"

### Text Tokenization

Text tokenization endpoint for text processing and tokenization.

```http
POST /api/tokenize
Content-Type: application/json

{
  "query": "text to tokenize"
}
```

**Parameters**:

- `query` (required): Text content to tokenize

## 🎯 Usage Guide

### Page Routes

- **Home Page** (`/`): Project entry page
- **Hybrid Search Page** (`/hybrid-search`): Main movie search page supporting multiple search methods
- **Movie Detail Page** (`/hybrid-search/[id]`): Movie detail information page, accessed via dynamic routing

### Search Features

1. **Multi-Database Hybrid Search**: Enter keywords on the search page, the system will perform hybrid queries combining vector search and keyword search
2. **Vector Search**: Pure vector search based on semantic similarity
3. **Full-Text Search**: Text search based on database full-text indexes
4. **Result Display**: Search results are displayed in card format, including movie posters, titles, ratings, and other information
5. **Similarity Score**: Each result displays a similarity score and progress bar
6. **Intelligent Fallback**: If vector search fails, the system automatically falls back to text search
7. **Detail View**: Click on search result cards to navigate to movie detail pages for complete information

## 🔧 Development Guide

### Adding New Search Types

1. Create a new API route in the `app/api/` directory
2. Add database connection management in `lib/multi-prisma.ts`
3. Update frontend pages to support the new search type

### Database Schema Updates

1. Modify `prisma/schema.prisma`
2. Run `npm run setup` to regenerate the client
3. Update related API and frontend code

## 🐛 Troubleshooting

### Common Issues

1. **Prisma Client Not Generated**

   ```bash
   npm run setup
   ```

2. **Database Connection Failed**

   - Check the database connection string in the `.env` file
   - Verify that the database service is running normally

3. **Vector Search Failed**

   - Check if the OpenAI API Key is correct
   - Verify that embedding field data is complete

4. **BigInt Serialization Error**
   - Automatically handled by the system, if issues persist, check data format

## 📝 Changelog

### v0.1.0

- Initial release
- Support for multi-database vector search
- Implementation of hybrid search functionality
- Added intelligent fallback mechanism

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

For questions or suggestions, please contact us through:

- Submit an Issue
- Send an email to [your-email@example.com]

---

**Note**: Please ensure all environment variables are properly configured in production environments and regularly backup the database.
