/**
 * SmartFileDetectionService - Servicio inteligente para detectar tipos de archivos
 * que puede generar la IA basándose en el contexto de la conversación
 * Similar a ChatGPT, analiza patrones y sugiere tipos de archivos relevantes
 */

class SmartFileDetectionService {
  constructor() {
    this.fileTypePatterns = this.initializeFileTypePatterns();
    this.contextKeywords = this.initializeContextKeywords();
    this.languagePatterns = this.initializeLanguagePatterns();
  }

  /**
   * Inicializa los patrones de detección para diferentes tipos de archivos
   */
  initializeFileTypePatterns() {
    return {
      // Archivos de código
      'javascript': {
        extensions: ['.js', '.jsx', '.mjs', '.ts', '.tsx'],
        keywords: ['javascript', 'js', 'node', 'react', 'vue', 'angular', 'typescript', 'ts', 'jsx', 'tsx', 'npm', 'yarn', 'webpack', 'babel'],
        patterns: [
          /function\s+\w+\s*\(/,
          /const\s+\w+\s*=/,
          /import\s+.*from/,
          /export\s+/,
          /console\.log/,
          /document\./,
          /window\./,
          /require\(/,
          /module\.exports/
        ],
        description: 'Archivos JavaScript/TypeScript',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#f7df1e'
      },
      'python': {
        extensions: ['.py', '.pyw', '.pyc', '.pyo'],
        keywords: ['python', 'py', 'django', 'flask', 'fastapi', 'pandas', 'numpy', 'matplotlib', 'tensorflow', 'pytorch', 'pip', 'conda', 'virtualenv'],
        patterns: [
          /def\s+\w+\s*\(/,
          /import\s+\w+/,
          /from\s+\w+\s+import/,
          /class\s+\w+/,
          /if\s+__name__\s*==\s*['"]__main__['"]/,
          /print\s*\(/,
          /#.*python/i
        ],
        description: 'Archivos Python',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#3776ab'
      },
      'java': {
        extensions: ['.java', '.class', '.jar'],
        keywords: ['java', 'spring', 'maven', 'gradle', 'jvm', 'jdk', 'jre', 'servlet', 'jsp', 'hibernate', 'mybatis'],
        patterns: [
          /public\s+class\s+\w+/,
          /import\s+java\./,
          /package\s+\w+/,
          /@Override/,
          /@Service/,
          /@Controller/,
          /System\.out\.print/
        ],
        description: 'Archivos Java',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ed8b00'
      },
      'cpp': {
        extensions: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.h', '.hxx'],
        keywords: ['c++', 'cpp', 'c', 'gcc', 'g++', 'cmake', 'make', 'stl', 'boost', 'qt', 'opengl', 'directx'],
        patterns: [
          /#include\s*<.*>/,
          /using\s+namespace/,
          /class\s+\w+/,
          /int\s+main\s*\(/,
          /std::/,
          /cout\s*<</,
          /cin\s*>>/
        ],
        description: 'Archivos C/C++',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#00599c'
      },
      'csharp': {
        extensions: ['.cs', '.csx'],
        keywords: ['c#', 'csharp', 'dotnet', '.net', 'asp.net', 'mvc', 'entity framework', 'linq', 'nuget', 'visual studio'],
        patterns: [
          /using\s+System/,
          /namespace\s+\w+/,
          /public\s+class\s+\w+/,
          /Console\.WriteLine/,
          /[A-Z]\w+\s+\w+\s*{/,
          /get;\s*set;/
        ],
        description: 'Archivos C#',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#239120'
      },
      'perl': {
        extensions: ['.pl', '.pm', '.t', '.pod'],
        keywords: ['perl', 'cpan', 'cpanm', 'perldoc', 'perlbrew', 'moose', 'catalyst', 'dancer', 'template toolkit'],
        patterns: [
          /#!\/usr\/bin\/perl/,
          /use\s+\w+/,
          /my\s+\$/,
          /print\s+/,
          /chomp\s*\(/,
          /if\s*\(/,
          /while\s*\(/,
          /foreach\s+/,
          /sub\s+\w+/,
          /package\s+\w+/
        ],
        description: 'Archivos Perl',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#39457e'
      },
      'ruby': {
        extensions: ['.rb', '.rbw', '.rake', '.gemspec'],
        keywords: ['ruby', 'rails', 'gem', 'bundler', 'rake', 'rspec', 'sinatra', 'haml', 'sass', 'coffeescript'],
        patterns: [
          /def\s+\w+/,
          /class\s+\w+/,
          /module\s+\w+/,
          /require\s+/,
          /puts\s+/,
          /@\w+/,
          /attr_accessor/,
          /include\s+/,
          /extend\s+/
        ],
        description: 'Archivos Ruby',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#cc342d'
      },
      'swift': {
        extensions: ['.swift'],
        keywords: ['swift', 'ios', 'macos', 'xcode', 'cocoa', 'swiftui', 'combine', 'alamofire'],
        patterns: [
          /import\s+\w+/,
          /class\s+\w+/,
          /struct\s+\w+/,
          /func\s+\w+/,
          /var\s+\w+/,
          /let\s+\w+/,
          /@IBOutlet/,
          /@IBAction/,
          /guard\s+let/,
          /if\s+let/
        ],
        description: 'Archivos Swift',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#fa7343'
      },
      'kotlin': {
        extensions: ['.kt', '.kts'],
        keywords: ['kotlin', 'android', 'jetpack', 'compose', 'gradle', 'maven', 'intellij'],
        patterns: [
          /fun\s+\w+/,
          /class\s+\w+/,
          /data\s+class/,
          /object\s+\w+/,
          /val\s+\w+/,
          /var\s+\w+/,
          /import\s+\w+/,
          /package\s+\w+/,
          /when\s*\(/,
          /suspend\s+fun/
        ],
        description: 'Archivos Kotlin',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#7f52ff'
      },
      'scala': {
        extensions: ['.scala', '.sc'],
        keywords: ['scala', 'akka', 'play', 'sbt', 'spark', 'cats', 'zio', 'scalaz'],
        patterns: [
          /object\s+\w+/,
          /class\s+\w+/,
          /trait\s+\w+/,
          /def\s+\w+/,
          /val\s+\w+/,
          /var\s+\w+/,
          /import\s+\w+/,
          /package\s+\w+/,
          /case\s+class/,
          /implicit\s+def/
        ],
        description: 'Archivos Scala',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#dc322f'
      },
      'rust': {
        extensions: ['.rs'],
        keywords: ['rust', 'cargo', 'tokio', 'serde', 'actix', 'rocket', 'diesel', 'clap'],
        patterns: [
          /fn\s+\w+/,
          /struct\s+\w+/,
          /enum\s+\w+/,
          /impl\s+\w+/,
          /let\s+\w+/,
          /use\s+\w+/,
          /mod\s+\w+/,
          /pub\s+fn/,
          /match\s+/,
          /if\s+let/
        ],
        description: 'Archivos Rust',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#dea584'
      },
      'dart': {
        extensions: ['.dart'],
        keywords: ['dart', 'flutter', 'pub', 'get', 'riverpod', 'bloc', 'provider'],
        patterns: [
          /import\s+'/,
          /class\s+\w+/,
          /void\s+main/,
          /Widget\s+\w+/,
          /StatefulWidget/,
          /StatelessWidget/,
          /Future\s*</,
          /Stream\s*</,
          /async\s+fn/,
          /await\s+/
        ],
        description: 'Archivos Dart',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#0175c2'
      },
      'php': {
        extensions: ['.php', '.phtml', '.php3', '.php4', '.php5', '.phps'],
        keywords: ['php', 'laravel', 'symfony', 'composer', 'twig', 'doctrine', 'eloquent', 'codeigniter'],
        patterns: [
          /<\?php/,
          /function\s+\w+/,
          /class\s+\w+/,
          /namespace\s+\w+/,
          /use\s+\w+/,
          /\$[a-zA-Z_][a-zA-Z0-9_]*/,
          /echo\s+/,
          /print\s+/,
          /if\s*\(/,
          /foreach\s*\(/
        ],
        description: 'Archivos PHP',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#777bb4'
      },
      'lua': {
        extensions: ['.lua'],
        keywords: ['lua', 'luajit', 'love2d', 'corona', 'defold', 'openresty'],
        patterns: [
          /function\s+\w+/,
          /local\s+\w+/,
          /if\s+then/,
          /for\s+\w+\s*=/,
          /while\s+do/,
          /end\s*$/,
          /require\s*\(/,
          /return\s+/,
          /table\./,
          /string\./
        ],
        description: 'Archivos Lua',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000080'
      },
      'r': {
        extensions: ['.r', '.R'],
        keywords: ['r', 'rstudio', 'shiny', 'ggplot2', 'dplyr', 'tidyverse', 'cran', 'bioconductor'],
        patterns: [
          /library\s*\(/,
          /require\s*\(/,
          /function\s*\(/,
          /<-/,
          /data\.frame/,
          /ggplot\s*\(/,
          /lm\s*\(/,
          /summary\s*\(/,
          /plot\s*\(/,
          /if\s*\(/
        ],
        description: 'Archivos R',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#276dc3'
      },
      'matlab': {
        extensions: ['.m'],
        keywords: ['matlab', 'simulink', 'octave', 'matlab compiler', 'toolbox'],
        patterns: [
          /function\s+\w+/,
          /end\s*$/,
          /if\s+.*end/,
          /for\s+.*end/,
          /while\s+.*end/,
          /plot\s*\(/,
          /fprintf\s*\(/,
          /disp\s*\(/,
          /zeros\s*\(/,
          /ones\s*\(/
        ],
        description: 'Archivos MATLAB',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#e16737'
      },
      'octave': {
        extensions: ['.m'],
        keywords: ['octave', 'gnu octave', 'matlab compatible'],
        patterns: [
          /function\s+\w+/,
          /end\s*$/,
          /if\s+.*end/,
          /for\s+.*end/,
          /while\s+.*end/,
          /plot\s*\(/,
          /fprintf\s*\(/,
          /disp\s*\(/,
          /zeros\s*\(/,
          /ones\s*\(/
        ],
        description: 'Archivos GNU Octave',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#0790c3'
      },
      'fortran': {
        extensions: ['.f', '.f90', '.f95', '.f03', '.f08'],
        keywords: ['fortran', 'gfortran', 'intel fortran', 'openmp', 'mpi'],
        patterns: [
          /program\s+\w+/,
          /subroutine\s+\w+/,
          /function\s+\w+/,
          /integer\s*::/,
          /real\s*::/,
          /character\s*::/,
          /if\s*\(/,
          /do\s+\w+/,
          /end\s+program/,
          /end\s+subroutine/
        ],
        description: 'Archivos Fortran',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#734f96'
      },
      'haskell': {
        extensions: ['.hs', '.lhs'],
        keywords: ['haskell', 'ghc', 'cabal', 'stack', 'hackage', 'purescript'],
        patterns: [
          /module\s+\w+/,
          /import\s+\w+/,
          /data\s+\w+/,
          /type\s+\w+/,
          /class\s+\w+/,
          /instance\s+\w+/,
          /where\s*$/,
          /let\s+\w+/,
          /in\s+/,
          /case\s+\w+/
        ],
        description: 'Archivos Haskell',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#5d4f85'
      },
      'erlang': {
        extensions: ['.erl', '.hrl'],
        keywords: ['erlang', 'otp', 'elixir', 'rebar3', 'cowboy', 'phoenix'],
        patterns: [
          /-module\s*\(/,
          /-export\s*\(/,
          /-import\s*\(/,
          /-record\s*\(/,
          /-define\s*\(/,
          /fun\s*\(/,
          /case\s+\w+/,
          /if\s+.*end/,
          /receive\s+.*end/,
          /spawn\s*\(/
        ],
        description: 'Archivos Erlang',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#a90533'
      },
      'elixir': {
        extensions: ['.ex', '.exs'],
        keywords: ['elixir', 'phoenix', 'ecto', 'plug', 'cowboy', 'nerves'],
        patterns: [
          /defmodule\s+\w+/,
          /def\s+\w+/,
          /defp\s+\w+/,
          /use\s+\w+/,
          /import\s+\w+/,
          /alias\s+\w+/,
          /require\s+\w+/,
          /case\s+\w+/,
          /cond\s+do/,
          /with\s+do/
        ],
        description: 'Archivos Elixir',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#4e2a8e'
      },
      'clojure': {
        extensions: ['.clj', '.cljs', '.cljc', '.edn'],
        keywords: ['clojure', 'clojurescript', 'leiningen', 'boot', 'reagent', 're-frame'],
        patterns: [
          /\(def\s+\w+/,
          /\(defn\s+\w+/,
          /\(defmacro\s+\w+/,
          /\(defprotocol\s+\w+/,
          /\(defrecord\s+\w+/,
          /\(defstruct\s+\w+/,
          /\(let\s*\[/,
          /\(if\s+/,
          /\(when\s+/,
          /\(cond\s+/
        ],
        description: 'Archivos Clojure',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#5881d8'
      },
      'fsharp': {
        extensions: ['.fs', '.fsi', '.fsx'],
        keywords: ['f#', 'fsharp', 'dotnet', 'paket', 'fake', 'suave'],
        patterns: [
          /module\s+\w+/,
          /open\s+\w+/,
          /let\s+\w+/,
          /type\s+\w+/,
          /interface\s+\w+/,
          /class\s+\w+/,
          /member\s+\w+/,
          /static\s+member/,
          /match\s+with/,
          /if\s+then/
        ],
        description: 'Archivos F#',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#378bba'
      },
      'ocaml': {
        extensions: ['.ml', '.mli', '.mll', '.mly'],
        keywords: ['ocaml', 'opam', 'dune', 'reason', 'bucklescript'],
        patterns: [
          /module\s+\w+/,
          /open\s+\w+/,
          /let\s+\w+/,
          /type\s+\w+/,
          /exception\s+\w+/,
          /match\s+with/,
          /if\s+then/,
          /fun\s+->/,
          /List\./,
          /Array\./
        ],
        description: 'Archivos OCaml',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ec6813'
      },
      'prolog': {
        extensions: ['.pl', '.pro'],
        keywords: ['prolog', 'swi-prolog', 'gprolog', 'yap', 'sicstus'],
        patterns: [
          /:-/,
          /\.\s*$/,
          /:-/,
          /\[/,
          /\]/,
          /,/,
          /;/,
          /!/,
          /fail/,
          /true/
        ],
        description: 'Archivos Prolog',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#74283c'
      },
      'lisp': {
        extensions: ['.lisp', '.lsp', '.cl', '.el'],
        keywords: ['lisp', 'common lisp', 'emacs lisp', 'scheme', 'racket', 'clojure'],
        patterns: [
          /\(defun\s+\w+/,
          /\(defvar\s+\w+/,
          /\(defparameter\s+\w+/,
          /\(defconstant\s+\w+/,
          /\(defmacro\s+\w+/,
          /\(defstruct\s+\w+/,
          /\(defclass\s+\w+/,
          /\(defmethod\s+\w+/,
          /\(if\s+/,
          /\(when\s+/
        ],
        description: 'Archivos Lisp',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000080'
      },
      'scheme': {
        extensions: ['.scm', '.ss', '.sls'],
        keywords: ['scheme', 'racket', 'guile', 'chicken', 'gambit'],
        patterns: [
          /\(define\s+\w+/,
          /\(define-syntax\s+\w+/,
          /\(lambda\s+/,
          /\(let\s+/,
          /\(let\*/,
          /\(if\s+/,
          /\(cond\s+/,
          /\(case\s+/,
          /\(and\s+/,
          /\(or\s+/
        ],
        description: 'Archivos Scheme',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#1e4a72'
      },
      'racket': {
        extensions: ['.rkt', '.rktl', '.rktd'],
        keywords: ['racket', 'drracket', 'raco', 'planet', 'typed racket'],
        patterns: [
          /#lang\s+\w+/,
          /\(define\s+\w+/,
          /\(define-syntax\s+\w+/,
          /\(lambda\s+/,
          /\(let\s+/,
          /\(let\*/,
          /\(if\s+/,
          /\(cond\s+/,
          /\(case\s+/,
          /\(and\s+/
        ],
        description: 'Archivos Racket',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#9f1d35'
      },
      'd': {
        extensions: ['.d', '.di'],
        keywords: ['d', 'dlang', 'dub', 'phobos', 'druntime'],
        patterns: [
          /module\s+\w+/,
          /import\s+\w+/,
          /class\s+\w+/,
          /struct\s+\w+/,
          /interface\s+\w+/,
          /enum\s+\w+/,
          /alias\s+\w+/,
          /template\s+\w+/,
          /mixin\s+\w+/,
          /version\s+/
        ],
        description: 'Archivos D',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ba595e'
      },
      'nim': {
        extensions: ['.nim', '.nims'],
        keywords: ['nim', 'nimble', 'nimscript', 'nimpy', 'nimx'],
        patterns: [
          /import\s+\w+/,
          /proc\s+\w+/,
          /func\s+\w+/,
          /method\s+\w+/,
          /type\s+\w+/,
          /object\s+\w+/,
          /enum\s+\w+/,
          /var\s+\w+/,
          /let\s+\w+/,
          /const\s+\w+/
        ],
        description: 'Archivos Nim',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ffc200'
      },
      'crystal': {
        extensions: ['.cr'],
        keywords: ['crystal', 'shards', 'kemal', 'lucky', 'amber'],
        patterns: [
          /require\s+"\w+"/,
          /class\s+\w+/,
          /struct\s+\w+/,
          /module\s+\w+/,
          /def\s+\w+/,
          /def\s+self\./,
          /property\s+\w+/,
          /getter\s+\w+/,
          /setter\s+\w+/,
          /include\s+\w+/
        ],
        description: 'Archivos Crystal',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000100'
      },
      'zig': {
        extensions: ['.zig'],
        keywords: ['zig', 'zls', 'zigmod', 'ziggy'],
        patterns: [
          /const\s+\w+/,
          /var\s+\w+/,
          /fn\s+\w+/,
          /struct\s+\w+/,
          /enum\s+\w+/,
          /union\s+\w+/,
          /comptime\s+/,
          /inline\s+/,
          /export\s+/,
          /extern\s+/
        ],
        description: 'Archivos Zig',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#f7a41d'
      },
      'v': {
        extensions: ['.v'],
        keywords: ['v', 'vlang', 'vpm', 'vls'],
        patterns: [
          /module\s+\w+/,
          /import\s+\w+/,
          /fn\s+\w+/,
          /struct\s+\w+/,
          /enum\s+\w+/,
          /interface\s+\w+/,
          /type\s+\w+/,
          /mut\s+\w+/,
          /const\s+\w+/,
          /pub\s+/
        ],
        description: 'Archivos V',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#4dabf7'
      },
      'julia': {
        extensions: ['.jl'],
        keywords: ['julia', 'jupyter', 'pluto', 'genie', 'turing'],
        patterns: [
          /function\s+\w+/,
          /struct\s+\w+/,
          /mutable\s+struct/,
          /abstract\s+type/,
          /primitive\s+type/,
          /using\s+\w+/,
          /import\s+\w+/,
          /export\s+\w+/,
          /macro\s+\w+/,
          /if\s+.*end/
        ],
        description: 'Archivos Julia',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#9558b2'
      },
      'powershell': {
        extensions: ['.ps1', '.psm1', '.psd1', '.ps1xml'],
        keywords: ['powershell', 'ps1', 'windows', 'cmdlet', 'module', 'script'],
        patterns: [
          /function\s+\w+/,
          /param\s*\(/,
          /Write-Host/,
          /Get-Content/,
          /Set-Content/,
          /Import-Module/,
          /Export-Module/,
          /if\s*\(/,
          /foreach\s*\(/,
          /try\s*{/
        ],
        description: 'Archivos PowerShell',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#012456'
      },
      'batch': {
        extensions: ['.bat', '.cmd'],
        keywords: ['batch', 'cmd', 'windows', 'dos', 'script'],
        patterns: [
          /@echo\s+off/,
          /echo\s+/,
          /set\s+\w+/,
          /if\s+.*goto/,
          /goto\s+\w+/,
          /call\s+/,
          /start\s+/,
          /pause/,
          /exit/,
          /rem\s+/
        ],
        description: 'Archivos Batch',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#c1c1c1'
      },
      'assembly': {
        extensions: ['.asm', '.s', '.S'],
        keywords: ['assembly', 'asm', 'x86', 'x64', 'arm', 'mips', 'gas', 'nasm'],
        patterns: [
          /\.section/,
          /\.global/,
          /\.extern/,
          /\.data/,
          /\.text/,
          /\.bss/,
          /mov\s+/,
          /add\s+/,
          /sub\s+/,
          /call\s+/
        ],
        description: 'Archivos Assembly',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#6e4c13'
      },
      'vhdl': {
        extensions: ['.vhdl', '.vhd'],
        keywords: ['vhdl', 'fpga', 'verilog', 'quartus', 'vivado', 'modelsim'],
        patterns: [
          /library\s+\w+/,
          /use\s+\w+/,
          /entity\s+\w+/,
          /architecture\s+\w+/,
          /process\s*\(/,
          /signal\s+\w+/,
          /variable\s+\w+/,
          /if\s+.*then/,
          /case\s+\w+/,
          /end\s+\w+/
        ],
        description: 'Archivos VHDL',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#8b4513'
      },
      'verilog': {
        extensions: ['.v', '.sv'],
        keywords: ['verilog', 'systemverilog', 'fpga', 'quartus', 'vivado', 'modelsim'],
        patterns: [
          /module\s+\w+/,
          /input\s+/,
          /output\s+/,
          /wire\s+/,
          /reg\s+/,
          /always\s*@/,
          /if\s*\(/,
          /case\s*\(/,
          /assign\s+/,
          /endmodule/
        ],
        description: 'Archivos Verilog',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#8b4513'
      },
      'tcl': {
        extensions: ['.tcl', '.tk'],
        keywords: ['tcl', 'tk', 'expect', 'tclsh', 'wish'],
        patterns: [
          /proc\s+\w+/,
          /set\s+\w+/,
          /if\s*\{/,
          /while\s*\{/,
          /foreach\s+\w+/,
          /puts\s+/,
          /gets\s+/,
          /expr\s+/,
          /source\s+/,
          /package\s+require/
        ],
        description: 'Archivos TCL',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#e4cc98'
      },
      'ada': {
        extensions: ['.adb', '.ads'],
        keywords: ['ada', 'spark', 'gnat', 'ada 95', 'ada 2005', 'ada 2012'],
        patterns: [
          /package\s+\w+/,
          /procedure\s+\w+/,
          /function\s+\w+/,
          /type\s+\w+/,
          /subtype\s+\w+/,
          /if\s+.*then/,
          /loop\s+.*end/,
          /case\s+\w+/,
          /begin\s+.*end/,
          /with\s+\w+/
        ],
        description: 'Archivos Ada',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#02f88c'
      },
      'cobol': {
        extensions: ['.cob', '.cbl', '.cobol'],
        keywords: ['cobol', 'mainframe', 'ibm', 'micro focus', 'gnu cobol'],
        patterns: [
          /IDENTIFICATION\s+DIVISION/,
          /PROGRAM-ID\s*\./,
          /DATA\s+DIVISION/,
          /PROCEDURE\s+DIVISION/,
          /WORKING-STORAGE\s+SECTION/,
          /01\s+\w+/,
          /IF\s+.*THEN/,
          /PERFORM\s+/,
          /MOVE\s+/,
          /DISPLAY\s+/
        ],
        description: 'Archivos COBOL',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ff6b6b'
      },
      'pascal': {
        extensions: ['.pas', '.pp', '.p'],
        keywords: ['pascal', 'delphi', 'free pascal', 'lazarus', 'object pascal'],
        patterns: [
          /program\s+\w+/,
          /unit\s+\w+/,
          /procedure\s+\w+/,
          /function\s+\w+/,
          /var\s+/,
          /const\s+/,
          /type\s+\w+/,
          /begin\s+.*end/,
          /if\s+.*then/,
          /while\s+.*do/
        ],
        description: 'Archivos Pascal',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#b0ce4e'
      },
      'smalltalk': {
        extensions: ['.st', '.cs'],
        keywords: ['smalltalk', 'pharo', 'squeak', 'visualworks', 'gnu smalltalk'],
        patterns: [
          /Object\s+subclass:/,
          /self\s+/,
          /super\s+/,
          /^[a-zA-Z][a-zA-Z0-9]*\s*$/,
          /ifTrue:/,
          /ifFalse:/,
          /do:/,
          /collect:/,
          /select:/,
          /reject:/
        ],
        description: 'Archivos Smalltalk',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#596706'
      },
      'forth': {
        extensions: ['.fth', '.fs', '.f'],
        keywords: ['forth', 'gforth', 'pforth', 'swiftforth'],
        patterns: [
          /:.*;/,
          /variable\s+/,
          /constant\s+/,
          /create\s+/,
          /does>/,
          /if\s+.*then/,
          /begin\s+.*until/,
          /begin\s+.*while/,
          /do\s+.*loop/,
          /dup\s+drop/
        ],
        description: 'Archivos Forth',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#341f97'
      },
      'apl': {
        extensions: ['.apl', '.dyalog'],
        keywords: ['apl', 'dyalog', 'gnu apl', 'j', 'k'],
        patterns: [
          /[⍺⍵]/,
          /[⍳⍴⍉]/,
          /[⌈⌊]/,
          /[∧∨]/,
          /[×÷]/,
          /[+-]/,
          /[<≤=≥>≠]/,
          /[⊢⊣]/,
          /[⊂⊃]/,
          /[⌽⊖]/
        ],
        description: 'Archivos APL',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#5a4fcf'
      },
      'j': {
        extensions: ['.ijs'],
        keywords: ['j', 'jsoftware', 'j language', 'array programming'],
        patterns: [
          /NB\./,
          /3\s*:\s*0/,
          /4\s*:\s*0/,
          /13\s*:\s*0/,
          /if\./,
          /do\./,
          /while\./,
          /for\./,
          /select\./,
          /case\./
        ],
        description: 'Archivos J',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#9e9e9e'
      },
      'k': {
        extensions: ['.k'],
        keywords: ['k', 'kdb+', 'q', 'kx systems', 'array programming'],
        patterns: [
          /\\d/,
          /\\l/,
          /\\p/,
          /\\q/,
          /\\t/,
          /\\v/,
          /\\w/,
          /\\x/,
          /\\z/,
          /\\[0-9]/
        ],
        description: 'Archivos K',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#3d9970'
      },
      'q': {
        extensions: ['.q'],
        keywords: ['q', 'kdb+', 'kx systems', 'array programming', 'time series'],
        patterns: [
          /\\d/,
          /\\l/,
          /\\p/,
          /\\q/,
          /\\t/,
          /\\v/,
          /\\w/,
          /\\x/,
          /\\z/,
          /\\[0-9]/
        ],
        description: 'Archivos Q',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#3d9970'
      },
      'wolfram': {
        extensions: ['.wl', '.wls', '.nb'],
        keywords: ['wolfram', 'mathematica', 'wolfram language', 'notebook'],
        patterns: [
          /Set\s*\[/,
          /Get\s*\[/,
          /Module\s*\[/,
          /With\s*\[/,
          /Block\s*\[/,
          /If\s*\[/,
          /Which\s*\[/,
          /Switch\s*\[/,
          /Do\s*\[/,
          /While\s*\[/
        ],
        description: 'Archivos Wolfram',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#dd1100'
      },
      'maxima': {
        extensions: ['.mac', '.max'],
        keywords: ['maxima', 'computer algebra', 'symbolic math', 'wxmaxima'],
        patterns: [
          /kill\s*\(/,
          /load\s*\(/,
          /save\s*\(/,
          /batch\s*\(/,
          /batchload\s*\(/,
          /batchrun\s*\(/,
          /if\s+.*then/,
          /for\s+.*do/,
          /while\s+.*do/,
          /block\s*\(/
        ],
        description: 'Archivos Maxima',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#8b4513'
      },
      'sage': {
        extensions: ['.sage', '.sagews'],
        keywords: ['sage', 'sagemath', 'computer algebra', 'python'],
        patterns: [
          /load\s*\(/,
          /save\s*\(/,
          /attach\s*\(/,
          /detach\s*\(/,
          /if\s+.*:/,
          /for\s+.*:/,
          /while\s+.*:/,
          /def\s+\w+/,
          /class\s+\w+/,
          /import\s+\w+/
        ],
        description: 'Archivos Sage',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#4c4c4c'
      },
      'maple': {
        extensions: ['.mpl', '.mws'],
        keywords: ['maple', 'maplesoft', 'computer algebra', 'symbolic math'],
        patterns: [
          /restart:/,
          /with\s*\(/,
          /read\s*\(/,
          /save\s*\(/,
          /if\s+.*then/,
          /for\s+.*do/,
          /while\s+.*do/,
          /proc\s*\(/,
          /end\s+proc/,
          /local\s+/
        ],
        description: 'Archivos Maple',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#d7191c'
      },
      'mathematica': {
        extensions: ['.nb', '.m', '.wl'],
        keywords: ['mathematica', 'wolfram', 'notebook', 'computer algebra'],
        patterns: [
          /Set\s*\[/,
          /Get\s*\[/,
          /Module\s*\[/,
          /With\s*\[/,
          /Block\s*\[/,
          /If\s*\[/,
          /Which\s*\[/,
          /Switch\s*\[/,
          /Do\s*\[/,
          /While\s*\[/
        ],
        description: 'Archivos Mathematica',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#dd1100'
      },
      'perl': {
        extensions: ['.pl', '.pm', '.t', '.pod'],
        keywords: ['perl', 'cpan', 'cpanm', 'perldoc', 'perlbrew', 'moose', 'catalyst', 'dancer', 'template toolkit'],
        patterns: [
          /#!\/usr\/bin\/perl/,
          /use\s+\w+/,
          /my\s+\$/,
          /print\s+/,
          /chomp\s*\(/,
          /if\s*\(/,
          /while\s*\(/,
          /foreach\s+/,
          /sub\s+\w+/,
          /package\s+\w+/
        ],
        description: 'Archivos Perl',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#39457e'
      },
      'ruby': {
        extensions: ['.rb', '.rbw', '.rake', '.gemspec'],
        keywords: ['ruby', 'rails', 'gem', 'bundler', 'rake', 'rspec', 'sinatra', 'haml', 'sass', 'coffeescript'],
        patterns: [
          /def\s+\w+/,
          /class\s+\w+/,
          /module\s+\w+/,
          /require\s+/,
          /puts\s+/,
          /puts\s+/,
          /@\w+/,
          /attr_accessor/,
          /include\s+/,
          /extend\s+/
        ],
        description: 'Archivos Ruby',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#cc342d'
      },
      'swift': {
        extensions: ['.swift'],
        keywords: ['swift', 'ios', 'macos', 'xcode', 'cocoa', 'swiftui', 'combine', 'alamofire'],
        patterns: [
          /import\s+\w+/,
          /class\s+\w+/,
          /struct\s+\w+/,
          /func\s+\w+/,
          /var\s+\w+/,
          /let\s+\w+/,
          /@IBOutlet/,
          /@IBAction/,
          /guard\s+let/,
          /if\s+let/
        ],
        description: 'Archivos Swift',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#fa7343'
      },
      'kotlin': {
        extensions: ['.kt', '.kts'],
        keywords: ['kotlin', 'android', 'jetpack', 'compose', 'gradle', 'maven', 'intellij'],
        patterns: [
          /fun\s+\w+/,
          /class\s+\w+/,
          /data\s+class/,
          /object\s+\w+/,
          /val\s+\w+/,
          /var\s+\w+/,
          /import\s+\w+/,
          /package\s+\w+/,
          /when\s*\(/,
          /suspend\s+fun/
        ],
        description: 'Archivos Kotlin',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#7f52ff'
      },
      'scala': {
        extensions: ['.scala', '.sc'],
        keywords: ['scala', 'akka', 'play', 'sbt', 'spark', 'cats', 'zio', 'scalaz'],
        patterns: [
          /object\s+\w+/,
          /class\s+\w+/,
          /trait\s+\w+/,
          /def\s+\w+/,
          /val\s+\w+/,
          /var\s+\w+/,
          /import\s+\w+/,
          /package\s+\w+/,
          /case\s+class/,
          /implicit\s+def/
        ],
        description: 'Archivos Scala',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#dc322f'
      },
      'rust': {
        extensions: ['.rs'],
        keywords: ['rust', 'cargo', 'tokio', 'serde', 'actix', 'rocket', 'diesel', 'clap'],
        patterns: [
          /fn\s+\w+/,
          /struct\s+\w+/,
          /enum\s+\w+/,
          /impl\s+\w+/,
          /let\s+\w+/,
          /use\s+\w+/,
          /mod\s+\w+/,
          /pub\s+fn/,
          /match\s+/,
          /if\s+let/
        ],
        description: 'Archivos Rust',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#dea584'
      },
      'dart': {
        extensions: ['.dart'],
        keywords: ['dart', 'flutter', 'pub', 'get', 'riverpod', 'bloc', 'provider'],
        patterns: [
          /import\s+'/,
          /class\s+\w+/,
          /void\s+main/,
          /Widget\s+\w+/,
          /StatefulWidget/,
          /StatelessWidget/,
          /Future\s*</,
          /Stream\s*</,
          /async\s+fn/,
          /await\s+/
        ],
        description: 'Archivos Dart',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#0175c2'
      },
      'php': {
        extensions: ['.php', '.phtml', '.php3', '.php4', '.php5', '.phps'],
        keywords: ['php', 'laravel', 'symfony', 'composer', 'twig', 'doctrine', 'eloquent', 'codeigniter'],
        patterns: [
          /<\?php/,
          /function\s+\w+/,
          /class\s+\w+/,
          /namespace\s+\w+/,
          /use\s+\w+/,
          /\$[a-zA-Z_][a-zA-Z0-9_]*/,
          /echo\s+/,
          /print\s+/,
          /if\s*\(/,
          /foreach\s*\(/
        ],
        description: 'Archivos PHP',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#777bb4'
      },
      'lua': {
        extensions: ['.lua'],
        keywords: ['lua', 'luajit', 'love2d', 'corona', 'defold', 'openresty'],
        patterns: [
          /function\s+\w+/,
          /local\s+\w+/,
          /if\s+then/,
          /for\s+\w+\s*=/,
          /while\s+do/,
          /end\s*$/,
          /require\s*\(/,
          /return\s+/,
          /table\./,
          /string\./
        ],
        description: 'Archivos Lua',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000080'
      },
      'r': {
        extensions: ['.r', '.R'],
        keywords: ['r', 'rstudio', 'shiny', 'ggplot2', 'dplyr', 'tidyverse', 'cran', 'bioconductor'],
        patterns: [
          /library\s*\(/,
          /require\s*\(/,
          /function\s*\(/,
          /<-/,
          /data\.frame/,
          /ggplot\s*\(/,
          /lm\s*\(/,
          /summary\s*\(/,
          /plot\s*\(/,
          /if\s*\(/
        ],
        description: 'Archivos R',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#276dc3'
      },
      'matlab': {
        extensions: ['.m'],
        keywords: ['matlab', 'simulink', 'octave', 'matlab compiler', 'toolbox'],
        patterns: [
          /function\s+\w+/,
          /end\s*$/,
          /if\s+.*end/,
          /for\s+.*end/,
          /while\s+.*end/,
          /plot\s*\(/,
          /fprintf\s*\(/,
          /disp\s*\(/,
          /zeros\s*\(/,
          /ones\s*\(/
        ],
        description: 'Archivos MATLAB',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#e16737'
      },
      'octave': {
        extensions: ['.m'],
        keywords: ['octave', 'gnu octave', 'matlab compatible'],
        patterns: [
          /function\s+\w+/,
          /end\s*$/,
          /if\s+.*end/,
          /for\s+.*end/,
          /while\s+.*end/,
          /plot\s*\(/,
          /fprintf\s*\(/,
          /disp\s*\(/,
          /zeros\s*\(/,
          /ones\s*\(/
        ],
        description: 'Archivos GNU Octave',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#0790c3'
      },
      'fortran': {
        extensions: ['.f', '.f90', '.f95', '.f03', '.f08'],
        keywords: ['fortran', 'gfortran', 'intel fortran', 'openmp', 'mpi'],
        patterns: [
          /program\s+\w+/,
          /subroutine\s+\w+/,
          /function\s+\w+/,
          /integer\s*::/,
          /real\s*::/,
          /character\s*::/,
          /if\s*\(/,
          /do\s+\w+/,
          /end\s+program/,
          /end\s+subroutine/
        ],
        description: 'Archivos Fortran',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#734f96'
      },
      'haskell': {
        extensions: ['.hs', '.lhs'],
        keywords: ['haskell', 'ghc', 'cabal', 'stack', 'hackage', 'purescript'],
        patterns: [
          /module\s+\w+/,
          /import\s+\w+/,
          /data\s+\w+/,
          /type\s+\w+/,
          /class\s+\w+/,
          /instance\s+\w+/,
          /where\s*$/,
          /let\s+\w+/,
          /in\s+/,
          /case\s+\w+/
        ],
        description: 'Archivos Haskell',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#5d4f85'
      },
      'erlang': {
        extensions: ['.erl', '.hrl'],
        keywords: ['erlang', 'otp', 'elixir', 'rebar3', 'cowboy', 'phoenix'],
        patterns: [
          /-module\s*\(/,
          /-export\s*\(/,
          /-import\s*\(/,
          /-record\s*\(/,
          /-define\s*\(/,
          /fun\s*\(/,
          /case\s+\w+/,
          /if\s+.*end/,
          /receive\s+.*end/,
          /spawn\s*\(/
        ],
        description: 'Archivos Erlang',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#a90533'
      },
      'elixir': {
        extensions: ['.ex', '.exs'],
        keywords: ['elixir', 'phoenix', 'ecto', 'plug', 'cowboy', 'nerves'],
        patterns: [
          /defmodule\s+\w+/,
          /def\s+\w+/,
          /defp\s+\w+/,
          /use\s+\w+/,
          /import\s+\w+/,
          /alias\s+\w+/,
          /require\s+\w+/,
          /case\s+\w+/,
          /cond\s+do/,
          /with\s+do/
        ],
        description: 'Archivos Elixir',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#4e2a8e'
      },
      'clojure': {
        extensions: ['.clj', '.cljs', '.cljc', '.edn'],
        keywords: ['clojure', 'clojurescript', 'leiningen', 'boot', 'reagent', 're-frame'],
        patterns: [
          /\(def\s+\w+/,
          /\(defn\s+\w+/,
          /\(defmacro\s+\w+/,
          /\(defprotocol\s+\w+/,
          /\(defrecord\s+\w+/,
          /\(defstruct\s+\w+/,
          /\(let\s*\[/,
          /\(if\s+/,
          /\(when\s+/,
          /\(cond\s+/
        ],
        description: 'Archivos Clojure',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#5881d8'
      },
      'fsharp': {
        extensions: ['.fs', '.fsi', '.fsx'],
        keywords: ['f#', 'fsharp', 'dotnet', 'paket', 'fake', 'suave'],
        patterns: [
          /module\s+\w+/,
          /open\s+\w+/,
          /let\s+\w+/,
          /type\s+\w+/,
          /interface\s+\w+/,
          /class\s+\w+/,
          /member\s+\w+/,
          /static\s+member/,
          /match\s+with/,
          /if\s+then/
        ],
        description: 'Archivos F#',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#378bba'
      },
      'ocaml': {
        extensions: ['.ml', '.mli', '.mll', '.mly'],
        keywords: ['ocaml', 'opam', 'dune', 'reason', 'bucklescript'],
        patterns: [
          /module\s+\w+/,
          /open\s+\w+/,
          /let\s+\w+/,
          /type\s+\w+/,
          /exception\s+\w+/,
          /match\s+with/,
          /if\s+then/,
          /fun\s+->/,
          /List\./,
          /Array\./
        ],
        description: 'Archivos OCaml',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ec6813'
      },
      'prolog': {
        extensions: ['.pl', '.pro'],
        keywords: ['prolog', 'swi-prolog', 'gprolog', 'yap', 'sicstus'],
        patterns: [
          /:-/,
          /\.\s*$/,
          /:-/,
          /\[/,
          /\]/,
          /,/,
          /;/,
          /!/,
          /fail/,
          /true/
        ],
        description: 'Archivos Prolog',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#74283c'
      },
      'lisp': {
        extensions: ['.lisp', '.lsp', '.cl', '.el'],
        keywords: ['lisp', 'common lisp', 'emacs lisp', 'scheme', 'racket', 'clojure'],
        patterns: [
          /\(defun\s+\w+/,
          /\(defvar\s+\w+/,
          /\(defparameter\s+\w+/,
          /\(defconstant\s+\w+/,
          /\(defmacro\s+\w+/,
          /\(defstruct\s+\w+/,
          /\(defclass\s+\w+/,
          /\(defmethod\s+\w+/,
          /\(if\s+/,
          /\(when\s+/
        ],
        description: 'Archivos Lisp',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000080'
      },
      'scheme': {
        extensions: ['.scm', '.ss', '.sls'],
        keywords: ['scheme', 'racket', 'guile', 'chicken', 'gambit'],
        patterns: [
          /\(define\s+\w+/,
          /\(define-syntax\s+\w+/,
          /\(lambda\s+/,
          /\(let\s+/,
          /\(let\*/,
          /\(if\s+/,
          /\(cond\s+/,
          /\(case\s+/,
          /\(and\s+/,
          /\(or\s+/
        ],
        description: 'Archivos Scheme',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#1e4a72'
      },
      'racket': {
        extensions: ['.rkt', '.rktl', '.rktd'],
        keywords: ['racket', 'drracket', 'raco', 'planet', 'typed racket'],
        patterns: [
          /#lang\s+\w+/,
          /\(define\s+\w+/,
          /\(define-syntax\s+\w+/,
          /\(lambda\s+/,
          /\(let\s+/,
          /\(let\*/,
          /\(if\s+/,
          /\(cond\s+/,
          /\(case\s+/,
          /\(and\s+/
        ],
        description: 'Archivos Racket',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#9f1d35'
      },
      'd': {
        extensions: ['.d', '.di'],
        keywords: ['d', 'dlang', 'dub', 'phobos', 'druntime'],
        patterns: [
          /module\s+\w+/,
          /import\s+\w+/,
          /class\s+\w+/,
          /struct\s+\w+/,
          /interface\s+\w+/,
          /enum\s+\w+/,
          /alias\s+\w+/,
          /template\s+\w+/,
          /mixin\s+\w+/,
          /version\s+/
        ],
        description: 'Archivos D',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ba595e'
      },
      'nim': {
        extensions: ['.nim', '.nims'],
        keywords: ['nim', 'nimble', 'nimscript', 'nimpy', 'nimx'],
        patterns: [
          /import\s+\w+/,
          /proc\s+\w+/,
          /func\s+\w+/,
          /method\s+\w+/,
          /type\s+\w+/,
          /object\s+\w+/,
          /enum\s+\w+/,
          /var\s+\w+/,
          /let\s+\w+/,
          /const\s+\w+/
        ],
        description: 'Archivos Nim',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ffc200'
      },
      'crystal': {
        extensions: ['.cr'],
        keywords: ['crystal', 'shards', 'kemal', 'lucky', 'amber'],
        patterns: [
          /require\s+"\w+"/,
          /class\s+\w+/,
          /struct\s+\w+/,
          /module\s+\w+/,
          /def\s+\w+/,
          /def\s+self\./,
          /property\s+\w+/,
          /getter\s+\w+/,
          /setter\s+\w+/,
          /include\s+\w+/
        ],
        description: 'Archivos Crystal',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000100'
      },
      'zig': {
        extensions: ['.zig'],
        keywords: ['zig', 'zls', 'zigmod', 'ziggy'],
        patterns: [
          /const\s+\w+/,
          /var\s+\w+/,
          /fn\s+\w+/,
          /struct\s+\w+/,
          /enum\s+\w+/,
          /union\s+\w+/,
          /comptime\s+/,
          /inline\s+/,
          /export\s+/,
          /extern\s+/
        ],
        description: 'Archivos Zig',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#f7a41d'
      },
      'v': {
        extensions: ['.v'],
        keywords: ['v', 'vlang', 'vpm', 'vls'],
        patterns: [
          /module\s+\w+/,
          /import\s+\w+/,
          /fn\s+\w+/,
          /struct\s+\w+/,
          /enum\s+\w+/,
          /interface\s+\w+/,
          /type\s+\w+/,
          /mut\s+\w+/,
          /const\s+\w+/,
          /pub\s+/
        ],
        description: 'Archivos V',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#4dabf7'
      },
      'julia': {
        extensions: ['.jl'],
        keywords: ['julia', 'jupyter', 'pluto', 'genie', 'turing'],
        patterns: [
          /function\s+\w+/,
          /struct\s+\w+/,
          /mutable\s+struct/,
          /abstract\s+type/,
          /primitive\s+type/,
          /using\s+\w+/,
          /import\s+\w+/,
          /export\s+\w+/,
          /macro\s+\w+/,
          /if\s+.*end/
        ],
        description: 'Archivos Julia',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#9558b2'
      },
      'nim': {
        extensions: ['.nim', '.nims'],
        keywords: ['nim', 'nimble', 'nimscript', 'nimpy', 'nimx'],
        patterns: [
          /import\s+\w+/,
          /proc\s+\w+/,
          /func\s+\w+/,
          /method\s+\w+/,
          /type\s+\w+/,
          /object\s+\w+/,
          /enum\s+\w+/,
          /var\s+\w+/,
          /let\s+\w+/,
          /const\s+\w+/
        ],
        description: 'Archivos Nim',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#ffc200'
      },
      'crystal': {
        extensions: ['.cr'],
        keywords: ['crystal', 'shards', 'kemal', 'lucky', 'amber'],
        patterns: [
          /require\s+"\w+"/,
          /class\s+\w+/,
          /struct\s+\w+/,
          /module\s+\w+/,
          /def\s+\w+/,
          /def\s+self\./,
          /property\s+\w+/,
          /getter\s+\w+/,
          /setter\s+\w+/,
          /include\s+\w+/
        ],
        description: 'Archivos Crystal',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000100'
      },
      'zig': {
        extensions: ['.zig'],
        keywords: ['zig', 'zls', 'zigmod', 'ziggy'],
        patterns: [
          /const\s+\w+/,
          /var\s+\w+/,
          /fn\s+\w+/,
          /struct\s+\w+/,
          /enum\s+\w+/,
          /union\s+\w+/,
          /comptime\s+/,
          /inline\s+/,
          /export\s+/,
          /extern\s+/
        ],
        description: 'Archivos Zig',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#f7a41d'
      },
      'v': {
        extensions: ['.v'],
        keywords: ['v', 'vlang', 'vpm', 'vls'],
        patterns: [
          /module\s+\w+/,
          /import\s+\w+/,
          /fn\s+\w+/,
          /struct\s+\w+/,
          /enum\s+\w+/,
          /interface\s+\w+/,
          /type\s+\w+/,
          /mut\s+\w+/,
          /const\s+\w+/,
          /pub\s+/
        ],
        description: 'Archivos V',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#4dabf7'
      },
      'julia': {
        extensions: ['.jl'],
        keywords: ['julia', 'jupyter', 'pluto', 'genie', 'turing'],
        patterns: [
          /function\s+\w+/,
          /struct\s+\w+/,
          /mutable\s+struct/,
          /abstract\s+type/,
          /primitive\s+type/,
          /using\s+\w+/,
          /import\s+\w+/,
          /export\s+\w+/,
          /macro\s+\w+/,
          /if\s+.*end/
        ],
        description: 'Archivos Julia',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#9558b2'
      },
      'php': {
        extensions: ['.php', '.phtml', '.php3', '.php4', '.php5'],
        keywords: ['php', 'laravel', 'symfony', 'codeigniter', 'wordpress', 'drupal', 'composer', 'apache', 'nginx'],
        patterns: [
          /<\?php/,
          /\$[a-zA-Z_][a-zA-Z0-9_]*/,
          /function\s+\w+\s*\(/,
          /class\s+\w+/,
          /echo\s+/,
          /require\s+['"]/,
          /include\s+['"]/
        ],
        description: 'Archivos PHP',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#777bb4'
      },
      'go': {
        extensions: ['.go'],
        keywords: ['golang', 'go', 'goroutine', 'channel', 'gofmt', 'go mod', 'gin', 'echo', 'fiber'],
        patterns: [
          /package\s+\w+/,
          /import\s+['"]/,
          /func\s+\w+\s*\(/,
          /type\s+\w+\s+struct/,
          /go\s+func/,
          /make\s*\(/,
          /chan\s+/
        ],
        description: 'Archivos Go',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#00add8'
      },
      'rust': {
        extensions: ['.rs'],
        keywords: ['rust', 'cargo', 'crate', 'tokio', 'serde', 'actix', 'rocket', 'warp'],
        patterns: [
          /fn\s+\w+\s*\(/,
          /let\s+\w+/,
          /use\s+\w+/,
          /struct\s+\w+/,
          /impl\s+\w+/,
          /match\s+\w+/,
          /Result<.*>/
        ],
        description: 'Archivos Rust',
        category: 'programming',
        icon: 'pi pi-code',
        color: '#000000'
      },

      // Archivos de datos
      'json': {
        extensions: ['.json'],
        keywords: ['json', 'api', 'rest', 'ajax', 'fetch', 'axios', 'http', 'restful', 'endpoint', 'response'],
        patterns: [
          /[{}[\]]/,
          /"[^"]*"\s*:/,
          /true|false|null/,
          /JSON\./,
          /\.json/
        ],
        description: 'Archivos JSON',
        category: 'data',
        icon: 'pi pi-file',
        color: '#000000'
      },
      'xml': {
        extensions: ['.xml', '.xsd', '.xsl', '.xslt'],
        keywords: ['xml', 'xpath', 'xslt', 'xsd', 'soap', 'rss', 'atom', 'sitemap', 'config'],
        patterns: [
          /<\?xml/,
          /<[^>]+>/,
          /<\/[^>]+>/,
          /<!DOCTYPE/,
          /<!\[CDATA\[/
        ],
        description: 'Archivos XML',
        category: 'data',
        icon: 'pi pi-file',
        color: '#ff6600'
      },
      'csv': {
        extensions: ['.csv'],
        keywords: ['csv', 'excel', 'spreadsheet', 'data', 'table', 'import', 'export', 'pandas', 'dataframe'],
        patterns: [
          /,.*,/,
          /".*",.*"/,
          /excel/i,
          /spreadsheet/i,
          /data\s+table/i
        ],
        description: 'Archivos CSV',
        category: 'data',
        icon: 'pi pi-table',
        color: '#1f6b75'
      },
      'yaml': {
        extensions: ['.yml', '.yaml'],
        keywords: ['yaml', 'yml', 'docker', 'kubernetes', 'k8s', 'ansible', 'github actions', 'ci/cd', 'config'],
        patterns: [
          /^[a-zA-Z_][a-zA-Z0-9_]*:/,
          /^\s*-\s/,
          /^\s*[a-zA-Z_][a-zA-Z0-9_]*:/,
          /---/,
          /\.\.\./
        ],
        description: 'Archivos YAML',
        category: 'config',
        icon: 'pi pi-file',
        color: '#cb171e'
      },

      // Archivos de configuración
      'dockerfile': {
        extensions: ['Dockerfile', '.dockerfile'],
        keywords: ['docker', 'container', 'image', 'dockerfile', 'kubernetes', 'k8s', 'deployment', 'microservice'],
        patterns: [
          /FROM\s+/,
          /RUN\s+/,
          /COPY\s+/,
          /WORKDIR\s+/,
          /EXPOSE\s+/,
          /CMD\s+/,
          /ENTRYPOINT\s+/
        ],
        description: 'Dockerfiles',
        category: 'config',
        icon: 'pi pi-cog',
        color: '#2496ed'
      },
      'docker-compose': {
        extensions: ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'],
        keywords: ['docker-compose', 'compose', 'services', 'networks', 'volumes', 'environment', 'ports'],
        patterns: [
          /version:\s*['"]/,
          /services:/,
          /networks:/,
          /volumes:/,
          /environment:/,
          /ports:/
        ],
        description: 'Docker Compose',
        category: 'config',
        icon: 'pi pi-cog',
        color: '#2496ed'
      },
      'nginx': {
        extensions: ['.conf', '.nginx'],
        keywords: ['nginx', 'proxy', 'load balancer', 'reverse proxy', 'server', 'upstream', 'location'],
        patterns: [
          /server\s*{/,
          /location\s+\//,
          /upstream\s+\w+/,
          /proxy_pass/,
          /listen\s+\d+/
        ],
        description: 'Configuración Nginx',
        category: 'config',
        icon: 'pi pi-server',
        color: '#009639'
      },
      'apache': {
        extensions: ['.conf', '.htaccess'],
        keywords: ['apache', 'httpd', 'htaccess', 'mod_rewrite', 'virtual host', 'directory', 'allow', 'deny'],
        patterns: [
          /<VirtualHost/,
          /<Directory/,
          /RewriteEngine\s+On/,
          /AllowOverride/,
          /DocumentRoot/
        ],
        description: 'Configuración Apache',
        category: 'config',
        icon: 'pi pi-server',
        color: '#d22128'
      },

      // Archivos de documentación
      'markdown': {
        extensions: ['.md', '.markdown'],
        keywords: ['markdown', 'md', 'readme', 'documentation', 'wiki', 'github', 'gitlab', 'docs'],
        patterns: [
          /^#\s+/,
          /^\*\s+/,
          /^\d+\.\s+/,
          /\[.*\]\(.*\)/,
          /```/,
          /^---$/
        ],
        description: 'Archivos Markdown',
        category: 'documentation',
        icon: 'pi pi-file',
        color: '#083fa1'
      },
      'html': {
        extensions: ['.html', '.htm', '.xhtml'],
        keywords: ['html', 'htm', 'web', 'page', 'website', 'browser', 'dom', 'css', 'javascript'],
        patterns: [
          /<!DOCTYPE\s+html/i,
          /<html/,
          /<head>/,
          /<body>/,
          /<div/,
          /<span/,
          /<p>/,
          /<a\s+href/
        ],
        description: 'Archivos HTML',
        category: 'web',
        icon: 'pi pi-globe',
        color: '#e34f26'
      },
      'css': {
        extensions: ['.css', '.scss', '.sass', '.less'],
        keywords: ['css', 'scss', 'sass', 'less', 'stylesheet', 'styling', 'responsive', 'bootstrap', 'tailwind'],
        patterns: [
          /\.[a-zA-Z][a-zA-Z0-9_-]*\s*\{/,
          /#[a-fA-F0-9]{3,6}/,
          /@media/,
          /@import/,
          /@keyframes/,
          /margin|padding|border|color|background/
        ],
        description: 'Archivos CSS',
        category: 'web',
        icon: 'pi pi-palette',
        color: '#1572b6'
      },

      // Archivos de base de datos
      'sql': {
        extensions: ['.sql'],
        keywords: ['sql', 'database', 'mysql', 'postgresql', 'sqlite', 'oracle', 'mssql', 'query', 'table', 'select', 'insert', 'update', 'delete'],
        patterns: [
          /SELECT\s+.*FROM/i,
          /INSERT\s+INTO/i,
          /UPDATE\s+.*SET/i,
          /DELETE\s+FROM/i,
          /CREATE\s+TABLE/i,
          /ALTER\s+TABLE/i,
          /DROP\s+TABLE/i
        ],
        description: 'Archivos SQL',
        category: 'database',
        icon: 'pi pi-database',
        color: '#336791'
      },

      // Archivos de configuración de sistemas
      'bash': {
        extensions: ['.sh', '.bash'],
        keywords: ['bash', 'shell', 'script', 'linux', 'unix', 'terminal', 'command', 'automation', 'deploy'],
        patterns: [
          /#!\/bin\/bash/,
          /#!\/bin\/sh/,
          /if\s+\[/,
          /for\s+\w+\s+in/,
          /while\s+\[/,
          /echo\s+/,
          /cd\s+/,
          /ls\s+/
        ],
        description: 'Scripts Bash',
        category: 'scripting',
        icon: 'pi pi-terminal',
        color: '#4eaa25'
      },
      'powershell': {
        extensions: ['.ps1', '.psm1', '.psd1'],
        keywords: ['powershell', 'ps1', 'windows', 'automation', 'cmdlet', 'module', 'script'],
        patterns: [
          /function\s+\w+/,
          /param\s*\(/,
          /Get-/,
          /Set-/,
          /Write-/,
          /$[a-zA-Z_][a-zA-Z0-9_]*/,
          /\.ps1/
        ],
        description: 'Scripts PowerShell',
        category: 'scripting',
        icon: 'pi pi-terminal',
        color: '#012456'
      },

      // Archivos de configuración de desarrollo
      'gitignore': {
        extensions: ['.gitignore'],
        keywords: ['git', 'gitignore', 'version control', 'repository', 'commit', 'push', 'pull'],
        patterns: [
          /^#/,
          /^\*/,
          /^\./,
          /node_modules/,
          /\.env/,
          /dist/,
          /build/
        ],
        description: 'Archivos .gitignore',
        category: 'config',
        icon: 'pi pi-github',
        color: '#f05032'
      },
      'env': {
        extensions: ['.env', '.env.local', '.env.production', '.env.development'],
        keywords: ['environment', 'env', 'variables', 'config', 'settings', 'api key', 'secret', 'database'],
        patterns: [
          /^[A-Z_][A-Z0-9_]*=/,
          /API_KEY/,
          /DATABASE_URL/,
          /SECRET/,
          /PASSWORD/,
          /TOKEN/
        ],
        description: 'Archivos de entorno',
        category: 'config',
        icon: 'pi pi-cog',
        color: '#ff6b6b'
      }
    };
  }

  /**
   * Inicializa palabras clave de contexto
   */
  initializeContextKeywords() {
    return {
      'web_development': ['website', 'web', 'frontend', 'backend', 'fullstack', 'browser', 'responsive', 'mobile'],
      'data_science': ['data', 'analysis', 'machine learning', 'ai', 'ml', 'dataset', 'statistics', 'visualization'],
      'mobile_development': ['mobile', 'app', 'ios', 'android', 'react native', 'flutter', 'swift', 'kotlin'],
      'devops': ['deploy', 'ci/cd', 'pipeline', 'infrastructure', 'cloud', 'aws', 'azure', 'docker', 'kubernetes'],
      'database': ['database', 'db', 'sql', 'nosql', 'mongodb', 'mysql', 'postgresql', 'redis'],
      'automation': ['script', 'automation', 'task', 'cron', 'scheduled', 'batch', 'workflow'],
      'documentation': ['documentation', 'readme', 'guide', 'tutorial', 'manual', 'wiki', 'docs'],
      'testing': ['test', 'testing', 'unit test', 'integration test', 'jest', 'mocha', 'cypress', 'selenium'],
      'security': ['security', 'auth', 'authentication', 'authorization', 'jwt', 'oauth', 'ssl', 'tls', 'encryption']
    };
  }

  /**
   * Inicializa patrones de lenguajes de programación
   */
  initializeLanguagePatterns() {
    return {
      'javascript': ['js', 'javascript', 'node', 'react', 'vue', 'angular', 'typescript'],
      'python': ['python', 'py', 'django', 'flask', 'fastapi', 'pandas', 'numpy'],
      'java': ['java', 'spring', 'maven', 'gradle'],
      'cpp': ['c++', 'cpp', 'c', 'gcc', 'g++'],
      'csharp': ['c#', 'csharp', 'dotnet', '.net'],
      'php': ['php', 'laravel', 'symfony'],
      'go': ['golang', 'go'],
      'rust': ['rust'],
      'ruby': ['ruby', 'rails', 'gem'],
      'swift': ['swift', 'ios'],
      'kotlin': ['kotlin', 'android'],
      'scala': ['scala', 'spark'],
      'r': ['r', 'statistics'],
      'matlab': ['matlab', 'simulink'],
      'perl': ['perl'],
      'lua': ['lua'],
      'dart': ['dart', 'flutter']
    };
  }

  /**
   * Analiza el contexto de la conversación para detectar tipos de archivos relevantes
   * @param {Array} messages - Array de mensajes de la conversación
   * @param {string} currentInput - Input actual del usuario
   * @returns {Array} Array de tipos de archivos detectados con su relevancia
   */
  analyzeContext(messages, currentInput = '') {
    const context = this.extractContext(messages, currentInput);
    const detectedTypes = this.detectFileTypes(context);
    return this.rankFileTypes(detectedTypes, context);
  }

  /**
   * Extrae contexto relevante de los mensajes
   */
  extractContext(messages, currentInput) {
    const allText = [
      currentInput,
      ...messages.slice(-10).map(msg => msg.content || '')
    ].join(' ').toLowerCase();

    return {
      text: allText,
      keywords: this.extractKeywords(allText),
      patterns: this.extractPatterns(allText),
      context: this.identifyContext(allText),
      languages: this.identifyLanguages(allText)
    };
  }

  /**
   * Extrae palabras clave del texto
   */
  extractKeywords(text) {
    const words = text.split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^\w]/g, ''));
    
    return [...new Set(words)];
  }

  /**
   * Extrae patrones de código del texto
   */
  extractPatterns(text) {
    const patterns = [];
    Object.values(this.fileTypePatterns).forEach(fileType => {
      fileType.patterns.forEach(pattern => {
        if (pattern.test(text)) {
          patterns.push(pattern);
        }
      });
    });
    return patterns;
  }

  /**
   * Identifica el contexto general de la conversación
   */
  identifyContext(text) {
    const contexts = [];
    Object.entries(this.contextKeywords).forEach(([context, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        contexts.push({
          name: context,
          matches: matches,
          score: matches.length
        });
      }
    });
    return contexts;
  }

  /**
   * Identifica lenguajes de programación mencionados
   */
  identifyLanguages(text) {
    const languages = [];
    Object.entries(this.languagePatterns).forEach(([lang, keywords]) => {
      const matches = keywords.filter(keyword => text.includes(keyword));
      if (matches.length > 0) {
        languages.push({
          name: lang,
          matches: matches,
          score: matches.length
        });
      }
    });
    return languages;
  }

  /**
   * Detecta tipos de archivos basándose en el contexto
   */
  detectFileTypes(context) {
    const detected = [];

    Object.entries(this.fileTypePatterns).forEach(([type, config]) => {
      let score = 0;
      const reasons = [];

      // Verificar palabras clave
      const keywordMatches = config.keywords.filter(keyword => 
        context.text.includes(keyword.toLowerCase())
      );
      if (keywordMatches.length > 0) {
        score += keywordMatches.length * 2;
        reasons.push(`Palabras clave: ${keywordMatches.join(', ')}`);
      }

      // Verificar patrones de código
      const patternMatches = config.patterns.filter(pattern => 
        pattern.test(context.text)
      );
      if (patternMatches.length > 0) {
        score += patternMatches.length * 3;
        reasons.push(`Patrones de código detectados`);
      }

      // Verificar contexto específico
      context.context.forEach(ctx => {
        if (this.isContextRelevant(type, ctx.name)) {
          score += ctx.score;
          reasons.push(`Contexto: ${ctx.name}`);
        }
      });

      // Verificar lenguajes de programación
      context.languages.forEach(lang => {
        if (this.isLanguageRelevant(type, lang.name)) {
          score += lang.score * 2;
          reasons.push(`Lenguaje: ${lang.name}`);
        }
      });

      if (score > 0) {
        detected.push({
          type,
          score,
          reasons,
          config: {
            description: config.description,
            category: config.category,
            icon: config.icon,
            color: config.color,
            extensions: config.extensions
          }
        });
      }
    });

    return detected;
  }

  /**
   * Verifica si un contexto es relevante para un tipo de archivo
   */
  isContextRelevant(fileType, contextName) {
    const relevanceMap = {
      'javascript': ['web_development', 'mobile_development', 'testing'],
      'python': ['data_science', 'web_development', 'automation'],
      'java': ['web_development', 'mobile_development'],
      'cpp': ['web_development', 'mobile_development'],
      'csharp': ['web_development', 'mobile_development'],
      'php': ['web_development'],
      'go': ['web_development', 'devops'],
      'rust': ['web_development', 'devops'],
      'json': ['web_development', 'data_science'],
      'xml': ['web_development', 'data_science'],
      'csv': ['data_science', 'database'],
      'yaml': ['devops', 'config'],
      'dockerfile': ['devops'],
      'docker-compose': ['devops'],
      'nginx': ['devops', 'web_development'],
      'apache': ['devops', 'web_development'],
      'markdown': ['documentation'],
      'html': ['web_development'],
      'css': ['web_development'],
      'sql': ['database', 'web_development'],
      'bash': ['devops', 'automation'],
      'powershell': ['automation', 'devops'],
      'gitignore': ['devops'],
      'env': ['devops', 'web_development']
    };

    return relevanceMap[fileType]?.includes(contextName) || false;
  }

  /**
   * Verifica si un lenguaje es relevante para un tipo de archivo
   */
  isLanguageRelevant(fileType, languageName) {
    return this.languagePatterns[languageName]?.includes(fileType) || false;
  }

  /**
   * Clasifica los tipos de archivos por relevancia
   */
  rankFileTypes(detectedTypes, context) {
    return detectedTypes
      .sort((a, b) => b.score - a.score)
      .slice(0, 8) // Top 8 tipos más relevantes
      .map(item => ({
        ...item,
        confidence: Math.min(item.score / 10, 1), // Normalizar a 0-1
        suggested: item.score > 5
      }));
  }

  /**
   * Obtiene sugerencias inteligentes de tipos de archivos
   * @param {Array} messages - Mensajes de la conversación
   * @param {string} currentInput - Input actual
   * @returns {Object} Objeto con tipos detectados y sugerencias
   */
  getSmartSuggestions(messages, currentInput = '') {
    const detected = this.analyzeContext(messages, currentInput);
    
    return {
      detected: detected,
      suggestions: this.generateSuggestions(detected),
      context: this.getContextSummary(detected),
      confidence: this.calculateOverallConfidence(detected)
    };
  }

  /**
   * Genera sugerencias basadas en los tipos detectados
   */
  generateSuggestions(detectedTypes) {
    const suggestions = [];
    
    detectedTypes.forEach(item => {
      if (item.suggested) {
        suggestions.push({
          type: item.type,
          description: item.config.description,
          icon: item.config.icon,
          color: item.config.color,
          extensions: item.config.extensions,
          confidence: item.confidence,
          reasons: item.reasons
        });
      }
    });

    return suggestions;
  }

  /**
   * Obtiene un resumen del contexto detectado
   */
  getContextSummary(detectedTypes) {
    const categories = {};
    detectedTypes.forEach(item => {
      const category = item.config.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(item.type);
    });

    return {
      categories,
      totalTypes: detectedTypes.length,
      suggestedTypes: detectedTypes.filter(item => item.suggested).length
    };
  }

  /**
   * Calcula la confianza general de la detección
   */
  calculateOverallConfidence(detectedTypes) {
    if (detectedTypes.length === 0) return 0;
    
    const totalScore = detectedTypes.reduce((sum, item) => sum + item.score, 0);
    const maxPossibleScore = detectedTypes.length * 10;
    
    return Math.min(totalScore / maxPossibleScore, 1);
  }

  /**
   * Obtiene todos los tipos de archivos disponibles
   */
  getAllFileTypes() {
    return Object.entries(this.fileTypePatterns).map(([type, config]) => ({
      type,
      description: config.description,
      category: config.category,
      icon: config.icon,
      color: config.color,
      extensions: config.extensions
    }));
  }

  /**
   * Obtiene tipos de archivos por categoría
   */
  getFileTypesByCategory(category) {
    return Object.entries(this.fileTypePatterns)
      .filter(([type, config]) => config.category === category)
      .map(([type, config]) => ({
        type,
        description: config.description,
        icon: config.icon,
        color: config.color,
        extensions: config.extensions
      }));
  }
}

// Crear instancia singleton
const smartFileDetectionService = new SmartFileDetectionService();

export default smartFileDetectionService;
