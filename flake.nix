{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=159be5db480d1df880a0135ca0bfed84c2f88353";
    flake-utils.url = "github:numtide/flake-utils";
  };
  outputs =
    {
      self,
      flake-utils,
      nixpkgs,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
          config.allowUnfree = true;
        };
        # This is needed in order to be able to format individual files
        # in vscode, because of: https://github.com/dprint/dprint/issues/552
        dprint-fmt-one-file = pkgs.callPackage (
          {
            dprint,
            gnused,
            lib,
            writeShellApplication,
          }:
          writeShellApplication {
            name = "dprint-fmt-one-file";
            text = ''
              file=$(echo "$1" | ${lib.getExe gnused} -E 's/(\[|\])/\[\1\]/g')

              exec ${lib.getExe dprint} fmt "$file"
            '';
          }
        ) { };
        devShell = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22
            nodePackages.pnpm
            dprint-fmt-one-file
            dprint
          ];
        };
      in
      {
        devShells.default = devShell;
      }
    );
}
