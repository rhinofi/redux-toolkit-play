{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=159be5db480d1df880a0135ca0bfed84c2f88353";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs = {
    self,
    flake-utils,
    nixpkgs,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        devShell = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            nodePackages.pnpm
            dprint
          ];
        };
      in {
        devShells.default = devShell;
      }
    );
}
